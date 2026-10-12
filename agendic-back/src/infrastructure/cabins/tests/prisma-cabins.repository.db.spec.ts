import 'dotenv/config';
import { ConflictError } from '../../../domain/errors';
import { ServiceCategory } from '../../../domain/services/service';
import { PrismaBusinessesRepository } from '../../businesses/prisma-businesses.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaServicesRepository } from '../../services/prisma-services.repository';
import { PrismaCabinsRepository } from '../prisma-cabins.repository';

/** Runs against the real database: the unique name per Sucursal is Postgres's job (ADR 0004, 0030). */
describe('PrismaCabinsRepository (real database)', () => {
  const prisma = new PrismaService();
  const businesses = new PrismaBusinessesRepository(prisma);
  const cabins = new PrismaCabinsRepository(prisma);
  const services = new PrismaServicesRepository(prisma);
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
    await prisma.serviceCabin.deleteMany({
      where: { cabin: { branchId: { in: [branchId, otherBranchId] } } },
    });
    await prisma.employeeService.deleteMany({
      where: { employee: { businessId } },
    });
    await prisma.service.deleteMany({ where: { branchId } });
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

  describe('the Cabinas a Servicio admits', () => {
    const newService = async (cabinIds: number[]) => {
      const employee = await prisma.employee.findFirstOrThrow({
        where: { businessId },
      });
      const availability = await prisma.availability.findFirstOrThrow({
        where: { userId },
      });
      return services.create({
        branchId,
        name: `Servicio ${Math.random()}`,
        description: null,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 10,
        depositPercent: null,
        requiresApproval: false,
        slug: `s-${Math.random()}`.replace('.', ''),
        hidden: false,
        prepMinutes: 0,
        dailyLimit: null,
        slotInterval: null,
        minimumNoticeMinutes: 0,
        employees: [{ employeeId: employee.id, availabilityId: availability.id }],
        cabinIds,
      });
    };

    it('replaces the set on update, answering the active ones by name', async () => {
      const b = await cabins.create(branchId, 'Set b');
      const a = await cabins.create(branchId, 'Set a');
      const c = await cabins.create(branchId, 'Set c');
      const service = await newService([b.id, a.id]);
      expect(service.cabins.map(({ name }) => name)).toEqual(['Set a', 'Set b']);

      const updated = await services.update(service.id, { cabinIds: [c.id] });
      expect(updated.cabins).toEqual([{ id: c.id, name: 'Set c' }]);

      const untouched = await services.update(service.id, { price: 11 });
      expect(untouched.cabins).toEqual([{ id: c.id, name: 'Set c' }]);

      const emptied = await services.update(service.id, { cabinIds: [] });
      expect(emptied.cabins).toEqual([]);
    });

    it('takes a Cabina dada de baja out of every Servicio that admitted it, keeping the others', async () => {
      const keep = await cabins.create(branchId, 'Keep');
      const drop = await cabins.create(branchId, 'Drop');
      const first = await newService([keep.id, drop.id]);
      const second = await newService([drop.id]);

      await cabins.retire(drop.id);

      expect((await services.findById(first.id))?.cabins).toEqual([
        { id: keep.id, name: 'Keep' },
      ]);
      expect((await services.findById(second.id))?.cabins).toEqual([]);
      await expect(
        prisma.serviceCabin.count({ where: { cabinId: drop.id } }),
      ).resolves.toBe(0);
    });
  });
});
