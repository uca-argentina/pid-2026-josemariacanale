import 'dotenv/config';
import { PrismaService } from '../../prisma.service';
import { PrismaBusinessesRepository } from '../../businesses/prisma-businesses.repository';
import { PrismaServicesRepository } from '../../services/prisma-services.repository';
import { PrismaUsersRepository } from '../prisma-users.repository';

/** Runs against the real database: the cascade of Dar de baja un Usuario spans five tables (ADR 0024). */
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
        client: { create: { name: 'Cliente', email: `${tag}-${label}@example.com` } },
      },
    });

  afterAll(async () => {
    const userIds = created.userIds;
    await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.invitation.deleteMany({ where: { businessId: { in: created.businessIds } } });
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

    expect(result.cancelledBookings).toHaveLength(2);
    expect(result.cancelledBookings).toEqual(
      expect.arrayContaining([
        { clientEmail: `${tag}-personal-pending@example.com`, link: `${tag}-personal-pending` },
        { clientEmail: `${tag}-shared-booked@example.com`, link: `${tag}-shared-booked` },
      ]),
    );
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

  it('retires a Dueño with their Negocio: all its Servicios and Staff, future Turnos and open Invitaciones, keeping Sucursales', async () => {
    const { user: owner, availability } = await makeUser('boss');
    const { user: worker, availability: workerAvailability } = await makeUser('worker');
    const { user: client } = await makeUser('client');
    const business = await prisma.business.create({
      data: { name: `${tag}-boss`, description: tag, ownerId: owner.id, slug: `${tag}-boss` },
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
    const service = await prisma.service.create({
      data: {
        branchId: branch.id,
        name: `${tag}-boss-service`,
        slug: `${tag}-boss-service`,
        category: 'CLINICA',
        durationMinutes: 60,
        price: 1,
      },
    });
    const ownerEmployee = await prisma.employee.create({ data: { userId: owner.id, businessId: business.id } });
    const workerEmployee = await prisma.employee.create({ data: { userId: worker.id, businessId: business.id } });
    await prisma.employeeService.createMany({
      data: [
        { employeeId: ownerEmployee.id, serviceId: service.id, availabilityId: availability.id },
        { employeeId: workerEmployee.id, serviceId: service.id, availabilityId: workerAvailability.id },
      ],
    });
    const open = await prisma.invitation.create({
      data: { businessId: business.id, email: `${tag}-open@example.com`, expiresAt: at(0) },
    });
    const workersFuture = await book(client.id, service.id, workerEmployee.id, at(12), 'BOOKED', 'boss-workers');
    const pending = await book(client.id, service.id, ownerEmployee.id, at(14), 'PENDING', 'boss-pending');
    const past = await book(client.id, service.id, workerEmployee.id, at(10, 2020), 'BOOKED', 'boss-past');

    const result = await repository.retire(owner.id, NOW);

    expect(result.cancelledBookings).toHaveLength(2);
    expect(result.cancelledBookings).toEqual(
      expect.arrayContaining([
        { clientEmail: `${tag}-boss-workers@example.com`, link: `${tag}-boss-workers` },
        { clientEmail: `${tag}-boss-pending@example.com`, link: `${tag}-boss-pending` },
      ]),
    );
    expect((await prisma.business.findUniqueOrThrow({ where: { id: business.id } })).deletedAt).toEqual(NOW);
    const retiredService = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(retiredService.deletedAt).toEqual(NOW);
    expect(retiredService.availabilityId).toBeNull();
    const staff = await prisma.employee.findMany({ where: { businessId: business.id } });
    expect(staff.map((e) => e.deletedAt)).toEqual([NOW, NOW]);
    expect(await prisma.employeeService.count({ where: { serviceId: service.id } })).toBe(0);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: open.id } })).closedAt).toEqual(NOW);
    const statusOf = async (id: number) => (await prisma.booking.findUniqueOrThrow({ where: { id } })).status;
    expect(await statusOf(workersFuture.id)).toBe('CANCELLED');
    expect(await statusOf(pending.id)).toBe('CANCELLED');
    expect(await statusOf(past.id)).toBe('BOOKED');
    expect(await prisma.branch.count({ where: { businessId: business.id } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: worker.id } })).deletedAt).toBeNull();

    // Lo dado de baja deja de verse, pero su Enlace de reserva sigue ocupado.
    const businesses = new PrismaBusinessesRepository(prisma);
    expect(await businesses.findBySlug(business.slug)).toBeNull();
    expect(await businesses.findById(business.id)).toBeNull();
    expect(await businesses.listByOwner(owner.id)).toEqual([]);
    expect(await new PrismaServicesRepository(prisma).findActiveBySlug(branch.id, service.slug)).toBeNull();
    await expect(
      prisma.business.create({
        data: { name: tag, description: tag, ownerId: client.id, slug: business.slug },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  }, 60_000);

  it('findByEmail ignores a Usuario dado de baja, so inviting that email reaches Clerk again', async () => {
    const { user } = await makeUser('findbyemail');
    expect((await repository.findByEmail(user.email))?.id).toBe(user.id);

    await repository.retire(user.id, NOW);

    expect(await repository.findByEmail(user.email)).toBeNull();
  }, 60_000);

  it('findByEmail counts the active Usuario when a dado de baja shares the email', async () => {
    const { user: retired } = await makeUser('sameemail-old');
    const active = await prisma.user.create({
      data: {
        clerkId: `${tag}-sameemail-new`,
        name: `${tag}-sameemail-new`,
        email: retired.email,
      },
    });
    created.userIds.push(active.id);
    await repository.retire(retired.id, NOW);

    expect((await repository.findByEmail(retired.email))?.id).toBe(active.id);
  }, 60_000);
});
