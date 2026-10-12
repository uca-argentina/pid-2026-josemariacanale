import 'dotenv/config';
import { ConflictError } from '../../domain/errors';
import { PrismaBusinessesRepository } from '../businesses/prisma-businesses.repository';
import { PrismaService } from '../prisma.service';
import { PrismaUsersRepository } from '../users/prisma-users.repository';

/** Runs against the real database: the cross uniqueness of the Enlace de reserva's first tramo is Postgres's job (ADR 0004, 0026). */
describe('BookingSlug (real database)', () => {
  const prisma = new PrismaService();
  const businesses = new PrismaBusinessesRepository(prisma);
  const users = new PrismaUsersRepository(prisma);
  const tag = `slug-${Date.now()}`;
  const created = { userIds: [] as number[], businessIds: [] as number[] };

  const makeUser = async (suffix: string) => {
    const user = await prisma.user.create({
      data: {
        clerkId: `${tag}-${suffix}`,
        name: `${tag}-${suffix}`,
        email: `${tag}-${suffix}@example.com`,
        availabilities: {
          create: {
            name: 'Horas laborables',
            timeZone: 'America/Argentina/Buenos_Aires',
            isDefault: true,
          },
        },
      },
    });
    created.userIds.push(user.id);
    return user;
  };

  const makeBusiness = async (ownerId: number, slug: string) => {
    const { business } = await businesses.create({
      business: { name: tag, description: tag, ownerId, slug },
      branch: {
        name: tag,
        address: 'Calle 1',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'sucursal',
      },
      employee: { userId: ownerId },
    });
    created.businessIds.push(business.id);
    return business;
  };

  const expectInUse = async (attempt: Promise<unknown>) => {
    const error = await attempt.then(
      () => undefined,
      (rejected: unknown) => rejected,
    );
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).message).toBe('Booking link already in use');
  };

  const owner = (slug: string) =>
    prisma.bookingSlug.findUnique({ where: { slug } });

  afterAll(async () => {
    await prisma.bookingSlug.deleteMany({
      where: {
        OR: [
          { userId: { in: created.userIds } },
          { businessId: { in: created.businessIds } },
        ],
      },
    });
    await prisma.branch.deleteMany({ where: { businessId: { in: created.businessIds } } });
    await prisma.employee.deleteMany({ where: { userId: { in: created.userIds } } });
    await prisma.business.deleteMany({ where: { id: { in: created.businessIds } } });
    await prisma.availability.deleteMany({ where: { userId: { in: created.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.$disconnect();
  });

  it('registers the slug of a Negocio and of a Usuario, each pointing to its own', async () => {
    const ana = await makeUser('ana');
    const bruno = await makeUser('bruno');
    const business = await makeBusiness(ana.id, `${tag}-salon`);
    await users.update(bruno.id, { slug: `${tag}-bruno` });

    expect(await owner(`${tag}-salon`)).toEqual({
      slug: `${tag}-salon`,
      businessId: business.id,
      userId: null,
    });
    expect(await owner(`${tag}-bruno`)).toEqual({
      slug: `${tag}-bruno`,
      businessId: null,
      userId: bruno.id,
    });
  });

  it('refuses a Negocio on the slug of a Usuario, and a Usuario on the slug of a Negocio', async () => {
    const carla = await makeUser('carla');
    const dario = await makeUser('dario');
    const elena = await makeUser('elena');
    await users.update(carla.id, { slug: `${tag}-carla` });
    await makeBusiness(dario.id, `${tag}-dario`);

    await expectInUse(makeBusiness(elena.id, `${tag}-carla`));
    await expectInUse(users.update(elena.id, { slug: `${tag}-dario` }));
    expect(await prisma.business.findUnique({ where: { ownerId: elena.id } })).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: elena.id } })).slug).toBeNull();
  });

  it('refuses a Usuario on the slug of their own Negocio', async () => {
    const flor = await makeUser('flor');
    await makeBusiness(flor.id, `${tag}-flor`);

    await expectInUse(users.update(flor.id, { slug: `${tag}-flor` }));
  });

  it('refuses a second Negocio or Usuario on the same kind of slug too', async () => {
    const gaby = await makeUser('gaby');
    const hugo = await makeUser('hugo');
    await users.update(gaby.id, { slug: `${tag}-gaby` });

    await expectInUse(users.update(hugo.id, { slug: `${tag}-gaby` }));
  });

  it('frees the old slug when the Negocio or the Usuario changes it', async () => {
    const ines = await makeUser('ines');
    const jose = await makeUser('jose');
    const kira = await makeUser('kira');
    const business = await makeBusiness(ines.id, `${tag}-ines-old`);
    await users.update(jose.id, { slug: `${tag}-jose-old` });

    await businesses.update(business.id, { slug: `${tag}-ines-new` });
    await users.update(jose.id, { slug: `${tag}-jose-new` });

    expect(await owner(`${tag}-ines-old`)).toBeNull();
    expect(await owner(`${tag}-jose-old`)).toBeNull();
    expect(await owner(`${tag}-ines-new`)).toMatchObject({ businessId: business.id });
    expect(await owner(`${tag}-jose-new`)).toMatchObject({ userId: jose.id });
    // The freed ones are now available to anyone, across kinds.
    await expect(users.update(kira.id, { slug: `${tag}-ines-old` })).resolves.toMatchObject({
      slug: `${tag}-ines-old`,
    });
  });

  it('keeps the slug of a Usuario dado de baja, and of their Negocio', async () => {
    const lia = await makeUser('lia');
    const mara = await makeUser('mara');
    await users.update(lia.id, { slug: `${tag}-lia` });
    await makeBusiness(lia.id, `${tag}-lia-negocio`);

    await users.retire(lia.id, new Date());

    expect(await owner(`${tag}-lia`)).not.toBeNull();
    expect(await owner(`${tag}-lia-negocio`)).not.toBeNull();
    await expectInUse(users.update(mara.id, { slug: `${tag}-lia` }));
    await expectInUse(makeBusiness(mara.id, `${tag}-lia-negocio`));
  });

  it('enforces exactly one of Negocio or Usuario, and lowercase', async () => {
    const nora = await makeUser('nora');
    const business = await makeBusiness(nora.id, `${tag}-nora`);

    await expect(
      prisma.bookingSlug.create({
        data: { slug: `${tag}-both`, businessId: business.id, userId: nora.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.bookingSlug.create({ data: { slug: `${tag}-none` } }),
    ).rejects.toThrow();
    await expect(
      prisma.bookingSlug.create({
        data: { slug: `${tag}-UPPER`, userId: nora.id },
      }),
    ).rejects.toThrow();
  });
});
