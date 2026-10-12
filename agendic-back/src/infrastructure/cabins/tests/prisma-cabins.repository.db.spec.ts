import 'dotenv/config';
import { ConflictError } from '../../../domain/errors';
import { PrismaBusinessesRepository } from '../../businesses/prisma-businesses.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaCabinsRepository } from '../prisma-cabins.repository';

/** Runs against the real database: the unique name per Sucursal is Postgres's job (ADR 0004, 0030). */
describe('PrismaCabinsRepository (real database)', () => {
  const prisma = new PrismaService();
  const businesses = new PrismaBusinessesRepository(prisma);
  const cabins = new PrismaCabinsRepository(prisma);
  const tag = `cabin-${Date.now()}`;
  let userId: number;
  let businessId: number;
  let branchId: number;
  let otherBranchId: number;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        clerkId: tag,
        name: tag,
        email: `${tag}@example.com`,
        availabilities: {
          create: {
            name: 'Horas laborables',
            timeZone: 'America/Argentina/Buenos_Aires',
            isDefault: true,
          },
        },
      },
    });
    userId = user.id;
    const { business, branch } = await businesses.create({
      business: { name: tag, description: tag, ownerId: userId, slug: tag },
      branch: {
        name: tag,
        address: 'Calle 1',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'sucursal',
      },
      employee: { userId },
    });
    businessId = business.id;
    branchId = branch.id;
    otherBranchId = (
      await prisma.branch.create({
        data: {
          businessId,
          name: 'Otra',
          address: 'Calle 2',
          timeZone: 'America/Argentina/Buenos_Aires',
          slug: 'otra',
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.cabin.deleteMany({
      where: { branchId: { in: [branchId, otherBranchId] } },
    });
    await prisma.branchImage.deleteMany({
      where: { branchId: { in: [branchId, otherBranchId] } },
    });
    await prisma.employee.deleteMany({ where: { businessId } });
    await prisma.branch.deleteMany({ where: { businessId } });
    await prisma.bookingSlug.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.availability.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const rejection = (attempt: Promise<unknown>) =>
    attempt.then(
      () => undefined,
      (rejected: unknown) => rejected,
    );

  it('refuses a name already used in the Sucursal, ignoring case, with the domain error', async () => {
    await cabins.create(branchId, 'Box Uno');

    const error = await rejection(cabins.create(branchId, 'box uno'));

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).message).toBe(
      `Cabin name box uno already in use in Branch ${branchId}`,
    );
  });

  it('allows the same name in another Sucursal', async () => {
    await cabins.create(branchId, 'Compartida');

    await expect(
      cabins.create(otherBranchId, 'compartida'),
    ).resolves.toMatchObject({ branchId: otherBranchId });
  });

  it('refuses renaming onto another active name, but allows changing only the case of its own', async () => {
    await cabins.create(branchId, 'Sala A');
    const sala = await cabins.create(branchId, 'Sala B');

    const error = await rejection(cabins.rename(sala, 'SALA a'));
    expect(error).toBeInstanceOf(ConflictError);

    await expect(cabins.rename(sala, 'SALA B')).resolves.toMatchObject({
      name: 'SALA B',
    });
  });

  it('frees the name once the Cabina is dada de baja, keeping the row', async () => {
    const old = await cabins.create(branchId, 'Reusable');
    await cabins.retire(old.id);

    await expect(cabins.create(branchId, 'reusable')).resolves.toMatchObject({
      name: 'reusable',
    });
    await expect(cabins.findById(old.id)).resolves.toMatchObject({
      id: old.id,
      deletedAt: expect.any(Date),
    });
  });

  it('lists only the active ones, by name', async () => {
    const gone = await cabins.create(otherBranchId, 'Zeta');
    await cabins.create(otherBranchId, 'beta');
    await cabins.create(otherBranchId, 'Alfa');
    await cabins.retire(gone.id);

    const names = (await cabins.listActiveByBranch(otherBranchId)).map(
      (cabin) => cabin.name,
    );

    // Postgres collation decides the case order, so only the active set and the alphabetical order are asserted.
    expect(names).toHaveLength(3);
    expect(names).not.toContain('Zeta');
    expect(names.map((n) => n.toLowerCase())).toEqual(
      [...names.map((n) => n.toLowerCase())].sort(),
    );
  });
});
