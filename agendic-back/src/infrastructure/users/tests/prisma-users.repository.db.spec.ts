import 'dotenv/config';
import { PrismaService } from '../../prisma.service';
import { PrismaUsersRepository } from '../prisma-users.repository';

/** Runs against the real database: the cascade of Dar de baja un Usuario spans five tables (ADR 0023). */
describe('PrismaUsersRepository.retire (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaUsersRepository(prisma);
  const tag = `retire-user-${Date.now()}`;
  const at = (hour: number, year = 2031) => new Date(Date.UTC(year, 0, 1, hour));
    const NOW = new Date(Date.UTC(2026, 0, 1, 12));
  const created = { userIds: [] as number[], businessIds: [] as number[] };

  const makeUser = async (suffix: string) => {
    const user = await prisma.user.create({
      data: {
        clerkId: `${tag}-${suffix}`,
        name: `${tag}-${suffix}`,
        email: `${tag}-${suffix}@example.com`,
      },
    });
    created.userIds.push(user.id);
    const availability = await prisma.availability.create({
      data: {
        userId: user.id,
        name: 'Horas laborables',
        timeZone: 'America/Argentina/Buenos_Aires',
        isDefault: true,
      },
    });
    return { user, availability };
  };

  const book = (
    userId: number,
    serviceId: number,
    employeeId: number | null,
    startsAt: Date,
    status: 'PENDING' | 'BOOKED' | 'CANCELLED' | 'REJECTED',
    label: string,
  ) =>
    prisma.booking.create({
      data: {
        serviceId,
        employeeId,
        userId,
        prepStartsAt: startsAt,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
        status,
        link: `${tag}-${label}`,
      },
    });

  afterAll(async () => {
    const userIds = created.userIds;
    await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.employeeService.deleteMany({
      where: { employee: { userId: { in: userIds } } },
    });
    await prisma.service.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { branch: { businessId: { in: created.businessIds } } }] },
    });
    await prisma.employee.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.branch.deleteMany({ where: { businessId: { in: created.businessIds } } });
    await prisma.business.deleteMany({ where: { id: { in: created.businessIds } } });
    await prisma.availability.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('retires the Usuario, their Servicios personales and Empleados, and cancels only their future live Turnos', async () => {
    const { user, availability } = await makeUser('leaving');
    const { user: owner } = await makeUser('owner');
    const { user: bystander } = await makeUser('bystander');

    const personal = await prisma.service.create({
      data: {
        userId: user.id,
        availabilityId: availability.id,
        name: `${tag}-personal`,
        slug: `${tag}-personal`,
        category: 'CLINICA',
        durationMinutes: 60,
        price: 1,
      },
    });
    const business = await prisma.business.create({
      data: { name: tag, description: tag, ownerId: owner.id, slug: tag },
    });
    created.businessIds.push(business.id);
    const branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: 'Downtown',
        address: '123 Main St',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'downtown',
      },
    });
    const shared = await prisma.service.create({
      data: {
        branchId: branch.id,
        name: `${tag}-shared`,
        slug: `${tag}-shared`,
        category: 'CLINICA',
        durationMinutes: 60,
        price: 1,
      },
    });
    const employee = await prisma.employee.create({
      data: { userId: user.id, businessId: business.id },
    });
    await prisma.employeeService.create({
      data: {
        employeeId: employee.id,
        serviceId: shared.id,
        availabilityId: availability.id,
      },
    });
    const ownerEmployee = await prisma.employee.create({
      data: { userId: owner.id, businessId: business.id },
    });

    const personalFuture = await book(user.id, personal.id, null, at(10), 'PENDING', 'personal-pending');
    const sharedFuture = await book(user.id, shared.id, employee.id, at(12), 'BOOKED', 'shared-booked');
    const past = await book(user.id, personal.id, null, at(10, 2020), 'BOOKED', 'past');
    const alreadyCancelled = await book(user.id, personal.id, null, at(14), 'CANCELLED', 'cancelled');
    const rejected = await book(user.id, personal.id, null, at(16), 'REJECTED', 'rejected');
    const others = await book(owner.id, shared.id, ownerEmployee.id, at(12), 'BOOKED', 'owners');

    const result = await repository.retire(user.id, NOW);

    expect(result).toEqual({ cancelledBookings: 2 });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt).toEqual(NOW);
    const retiredPersonal = await prisma.service.findUniqueOrThrow({ where: { id: personal.id } });
    expect(retiredPersonal.deletedAt).toEqual(NOW);
    expect(retiredPersonal.availabilityId).toBeNull();
    expect((await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } })).deletedAt).toEqual(NOW);
    expect(await prisma.employeeService.count({ where: { employeeId: employee.id } })).toBe(0);

    const statusOf = async (id: number) =>
      (await prisma.booking.findUniqueOrThrow({ where: { id } })).status;
    expect(await statusOf(personalFuture.id)).toBe('CANCELLED');
    expect(await statusOf(sharedFuture.id)).toBe('CANCELLED');
    expect(await statusOf(past.id)).toBe('BOOKED');
    expect(await statusOf(alreadyCancelled.id)).toBe('CANCELLED');
    expect(await statusOf(rejected.id)).toBe('REJECTED');
    expect(await statusOf(others.id)).toBe('BOOKED');

    // The last Empleado of the Servicio left: it stays offered, with nobody to attend it.
    const keptShared = await prisma.service.findUniqueOrThrow({ where: { id: shared.id } });
    expect(keptShared.deletedAt).toBeNull();
    expect(await prisma.employeeService.count({ where: { serviceId: shared.id } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: bystander.id } })).deletedAt).toBeNull();
    expect((await prisma.employee.findUniqueOrThrow({ where: { id: ownerEmployee.id } })).deletedAt).toBeNull();
  }, 60_000);

  it('findByEmail ignores a Usuario dado de baja, so inviting that email reaches Clerk again', async () => {
    const { user } = await makeUser('findbyemail');
    expect((await repository.findByEmail(user.email))?.id).toBe(user.id);

    await repository.retire(user.id, NOW);

    expect(await repository.findByEmail(user.email)).toBeNull();
  }, 60_000);
});
