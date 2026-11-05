import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { PrismaBookingsRepository } from '../../bookings/prisma-bookings.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaEmployeesRepository } from '../prisma-employees.repository';

/** Runs against the real database: the Sucursales, the Servicios dejados de Ofrecer and the cancellations are one transaction. */
describe('PrismaEmployeesRepository branches (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaEmployeesRepository(prisma);
  const bookings = new PrismaBookingsRepository(prisma);
  const tag = `emp-branches-${Date.now()}`;
  const now = new Date(Date.UTC(2031, 0, 10, 12));
  const userIds: number[] = [];
  let businessId: number;
  let branchA: number;
  let branchB: number;
  let branchC: number;
  let serviceA: number;
  let serviceB: number;
  let employeeId: number;
  let availabilityId: number;

  const book = (serviceId: number, day: number, status: BookingStatus.PENDING | BookingStatus.BOOKED = BookingStatus.BOOKED) =>
    bookings.create({
      serviceId,
      employeeId,
      userId: userIds[1],
      cabinId: null,
      clientName: `Cliente ${day}`,
      clientEmail: `${tag}-${day}@example.com`,
      prepStartsAt: new Date(Date.UTC(2031, 0, day, 10)),
      startsAt: new Date(Date.UTC(2031, 0, day, 10)),
      endsAt: new Date(Date.UTC(2031, 0, day, 11)),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 50,
      status,
      acceptedAt: new Date(),
    });

  const branchesOf = async () =>
    (await prisma.employeeBranch.findMany({ where: { employeeId }, orderBy: { branchId: 'asc' } })).map(
      ({ branchId }) => branchId,
    );
  const servicesOf = async () =>
    (await prisma.employeeService.findMany({ where: { employeeId }, orderBy: { serviceId: 'asc' } })).map(
      ({ serviceId }) => serviceId,
    );

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { clerkId: `${tag}-o`, name: tag, email: `${tag}-o@example.com` },
    });
    const worker = await prisma.user.create({
      data: { clerkId: `${tag}-w`, name: `${tag}-w`, email: `${tag}-w@example.com` },
    });
    userIds.push(owner.id, worker.id);
    availabilityId = (
      await prisma.availability.create({
        data: { userId: worker.id, name: 'BA', timeZone: 'UTC', isDefault: true },
      })
    ).id;
    businessId = (
      await prisma.business.create({
        data: { name: tag, description: tag, ownerId: owner.id, slug: tag },
      })
    ).id;
    const branch = (slug: string) =>
      prisma.branch
        .create({
          data: { businessId, name: slug, address: 'x', timeZone: 'America/Argentina/Buenos_Aires', slug },
        })
        .then(({ id }) => id);
    [branchA, branchB, branchC] = [await branch('a'), await branch('b'), await branch('c')];
    const service = (branchId: number, slug: string) =>
      prisma.service
        .create({
          data: { branchId, name: slug, slug, category: 'CLINICA', durationMinutes: 60, price: 1 },
        })
        .then(({ id }) => id);
    [serviceA, serviceB] = [await service(branchA, 'sa'), await service(branchB, 'sb')];
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany({ where: { serviceId: { in: [serviceA, serviceB] } } });
    await prisma.employeeService.deleteMany({ where: { serviceId: { in: [serviceA, serviceB] } } });
    await prisma.employee.deleteMany({ where: { businessId } });
    employeeId = (
      await repository.create({ userId: userIds[1], businessId, branchIds: [branchA, branchB] })
    ).id;
    await prisma.employeeService.createMany({
      data: [serviceA, serviceB].map((serviceId) => ({ employeeId, serviceId, availabilityId })),
    });
  });

  afterAll(async () => {
    if (businessId !== undefined) {
      await prisma.booking.deleteMany({ where: { serviceId: { in: [serviceA, serviceB] } } });
      await prisma.employeeService.deleteMany({ where: { serviceId: { in: [serviceA, serviceB] } } });
      await prisma.employee.deleteMany({ where: { businessId } });
      await prisma.service.deleteMany({ where: { branchId: { in: [branchA, branchB, branchC] } } });
      await prisma.branch.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
    }
    await prisma.availability.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.client.deleteMany({ where: { email: { startsWith: tag } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  describe('listUpcomingInBranches', () => {
    it('lists the open future Turnos of the Servicios of those Sucursales, by startsAt, with what the vista previa shows', async () => {
      const later = await book(serviceB, 20);
      const sooner = await book(serviceB, 15, BookingStatus.PENDING);
      await book(serviceA, 16); // another Sucursal
      const cancelled = await book(serviceB, 17);
      await bookings.cancel(cancelled.id, now, null);
      await book(serviceB, 9); // started

      const upcoming = await repository.listUpcomingInBranches(employeeId, [branchB], now);

      expect(upcoming).toEqual([
        {
          id: sooner.id,
          startsAt: sooner.startsAt,
          endsAt: sooner.endsAt,
          timeZone: 'America/Argentina/Buenos_Aires',
          serviceName: 'sb',
          clientName: 'Cliente 15',
          clientEmail: `${tag}-15@example.com`,
          link: expect.any(String),
          seriesId: null,
          branch: { id: branchB, name: 'b' },
        },
        expect.objectContaining({ id: later.id }),
      ]);
    });
  });

  describe('changeBranches', () => {
    it('adds a Sucursal and touches nothing else', async () => {
      const turno = await book(serviceA, 15);

      const { employee, cancelledIds } = await repository.changeBranches(
        employeeId,
        [branchA, branchB, branchC],
        [],
        now,
      );

      expect(employee.branchIds).toEqual([branchA, branchB, branchC]);
      expect(cancelledIds).toEqual([]);
      expect(await servicesOf()).toEqual([serviceA, serviceB]);
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } })).status).toBe('BOOKED');
    });

    it('removes a Sucursal, stops Ofreciendo its Servicios and cancels the confirmed Turnos as the Empleado', async () => {
      const inLost = await book(serviceB, 15);
      const kept = await book(serviceA, 16);

      const { employee, cancelledIds } = await repository.changeBranches(
        employeeId,
        [branchA],
        [inLost.id],
        now,
      );

      expect(employee.branchIds).toEqual([branchA]);
      expect(cancelledIds).toEqual([inLost.id]);
      expect(await branchesOf()).toEqual([branchA]);
      expect(await servicesOf()).toEqual([serviceA]);
      const row = await prisma.booking.findUniqueOrThrow({ where: { id: inLost.id } });
      expect([row.status, row.cancelledBy, row.cancellationReason, row.cancellationCause]).toEqual([
        'CANCELLED',
        'EMPLOYEE',
        null,
        null,
      ]);
      expect(row.cancelledAt?.getTime()).toBe(now.getTime());
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: kept.id } })).status).toBe('BOOKED');
    });

    it('does not cancel a Turno already cancelled or one that started, and reports only the ones it cancelled', async () => {
      const open = await book(serviceB, 15);
      const alreadyCancelled = await book(serviceB, 16);
      await bookings.cancel(alreadyCancelled.id, now, 'Antes');
      const started = await book(serviceB, 9);

      const { cancelledIds } = await repository.changeBranches(
        employeeId,
        [branchA],
        [open.id, alreadyCancelled.id, started.id],
        now,
      );

      expect(cancelledIds).toEqual([open.id]);
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: started.id } })).status).toBe('BOOKED');
    });

    it('answers a conflict and writes nothing when a Turno appeared in a lost Sucursal since the vista previa', async () => {
      const seen = await book(serviceB, 15);
      const appeared = await book(serviceB, 16);

      await expect(
        repository.changeBranches(employeeId, [branchA], [seen.id], now),
      ).rejects.toThrow('Los Turnos que se cancelan cambiaron');

      expect(await branchesOf()).toEqual([branchA, branchB]);
      expect(await servicesOf()).toEqual([serviceA, serviceB]);
      const rows = await prisma.booking.findMany({ where: { id: { in: [seen.id, appeared.id] } } });
      expect(rows.map((r) => r.status)).toEqual(['BOOKED', 'BOOKED']);
    });

    it('leaves the Sucursales and the Servicios as they were when the transaction fails', async () => {
      await expect(
        repository.changeBranches(employeeId, [branchA, 999_999_999], [], now),
      ).rejects.toThrow();

      expect(await branchesOf()).toEqual([branchA, branchB]);
      expect(await servicesOf()).toEqual([serviceA, serviceB]);
    });
  });
});
