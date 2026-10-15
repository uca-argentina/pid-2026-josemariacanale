import 'dotenv/config';
import { BookingActor, BookingStatus } from '../../../domain/bookings/booking';
import { SeriesBookingData } from '../../../domain/bookings/bookings.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: the status guards of the bulk updates must hold even when two requests race (#305, ADR 0032). */
describe('PrismaBookingsRepository, acciones sobre la Serie (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `booking-series-actions-${Date.now()}`;
  const userIds: number[] = [];
  let businessId: number;
  let serviceId: number;

  /** UTC hours on 2033-01-<day>. */
  const at = (day: number, hours: number) =>
    new Date(Date.UTC(2033, 0, day) + hours * 3_600_000);

  const item = (
    user: number,
    startsAt: Date,
    status: BookingStatus.PENDING | BookingStatus.BOOKED = BookingStatus.PENDING,
  ): SeriesBookingData => ({
    date: startsAt.toISOString().slice(0, 10),
    cabinIds: [],
    data: {
      serviceId,
      employeeId: null,
      userId: userIds[user],
      clientName: 'Bruno',
      clientEmail: `${tag}@example.com`,
      prepStartsAt: startsAt,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3_600_000),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 50,
      status,
      acceptedAt: status === BookingStatus.BOOKED ? new Date() : null,
    },
  });

  /** A Serie of PENDING Turnos on the given days at 10:00, of `user`. */
  const serie = (user: number, days: number[]) =>
    repository.createSeries(days.map((day) => item(user, at(day, 10))));

  const statuses = async (ids: number[]) =>
    (await prisma.booking.findMany({ where: { id: { in: ids } }, orderBy: { startsAt: 'asc' } })).map(
      ({ status }) => status,
    );

  beforeAll(async () => {
    for (const n of [0, 1])
      userIds.push(
        (
          await prisma.user.create({
            data: { clerkId: `${tag}-${n}`, name: tag, email: `${n}-${tag}@example.com` },
          })
        ).id,
      );
    businessId = (
      await prisma.business.create({
        data: { name: tag, description: tag, ownerId: userIds[0], slug: tag },
      })
    ).id;
    const { id: branchId } = await prisma.branch.create({
      data: {
        businessId,
        name: 'Centro',
        address: 'Calle 1',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'centro',
      },
    });
    serviceId = (
      await prisma.service.create({
        data: { branchId, name: tag, slug: tag, category: 'SPA', durationMinutes: 60, price: 1 },
      })
    ).id;
  }, 60_000);

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.branch.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('accepts only the PENDING Turnos of the Serie that have not ended, of that attendant', async () => {
    const created = await serie(0, [2, 9, 16, 23]);
    await prisma.booking.update({ where: { id: created[1].id }, data: { status: BookingStatus.CANCELLED } });
    // From the point of view of `now`, the Turnos of days 2 and 9 are already over.
    const now = at(10, 0);
    const other = await serie(1, [2, 9]);

    const accepted = await repository.resolvePendingSeries(
      created[0].seriesId!,
      userIds[0],
      BookingStatus.BOOKED,
      now,
      null,
    );

    expect(accepted.map(({ id }) => id)).toEqual([created[2].id, created[3].id]);
    expect(accepted.every(({ acceptedAt }) => acceptedAt?.getTime() === now.getTime())).toBe(true);
    expect(await statuses(created.map(({ id }) => id))).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CANCELLED,
      BookingStatus.BOOKED,
      BookingStatus.BOOKED,
    ]);
    expect(await statuses(other.map(({ id }) => id))).toEqual([BookingStatus.PENDING, BookingStatus.PENDING]);
  }, 60_000);

  it('rejects with the Motivo and who did it, and writes it on every Turno', async () => {
    const created = await serie(0, [3, 10]);

    const rejected = await repository.resolvePendingSeries(
      created[0].seriesId!,
      userIds[0],
      BookingStatus.REJECTED,
      at(1, 0),
      'No atendemos',
    );

    expect(rejected).toHaveLength(2);
    expect(rejected).toEqual(
      rejected.map(() =>
        expect.objectContaining({
          status: BookingStatus.REJECTED,
          cancelledBy: BookingActor.EMPLOYEE,
          cancellationReason: 'No atendemos',
        }),
      ),
    );
    expect(rejected.every(({ rejectedAt }) => rejectedAt !== null)).toBe(true);
  }, 60_000);

  it('lets exactly one of an Aceptar and a Rechazar that race win each Turno', async () => {
    const created = await serie(0, [4, 11, 18, 25]);
    const seriesId = created[0].seriesId!;

    const [accepted, rejected] = await Promise.all([
      repository.resolvePendingSeries(seriesId, userIds[0], BookingStatus.BOOKED, at(1, 0), null),
      repository.resolvePendingSeries(seriesId, userIds[0], BookingStatus.REJECTED, at(1, 0), null),
    ]);

    const won = [...accepted, ...rejected].map(({ id }) => id).sort((a, b) => a - b);
    expect(won).toEqual(created.map(({ id }) => id).sort((a, b) => a - b));
    const final = await prisma.booking.findMany({ where: { id: { in: created.map(({ id }) => id) } } });
    for (const { id, status } of final) {
      expect(status).toBe(
        accepted.some((b) => b.id === id) ? BookingStatus.BOOKED : BookingStatus.REJECTED,
      );
    }
  }, 60_000);

  it('cancels this Turno and the following ones, keeping the previous, and not a Turno already cancelled', async () => {
    const created = await repository.createSeries(
      [5, 12, 19, 26].map((day) => item(0, at(day, 10), BookingStatus.BOOKED)),
    );
    await prisma.booking.update({ where: { id: created[3].id }, data: { status: BookingStatus.REJECTED } });

    const cancelled = await repository.cancelSeriesFrom(
      created[0].seriesId!,
      userIds[0],
      created[1].startsAt,
      at(1, 0),
      'Estoy enfermo',
    );

    expect(cancelled.map(({ id }) => id)).toEqual([created[1].id, created[2].id]);
    expect(cancelled).toEqual(
      cancelled.map(() =>
        expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancelledBy: BookingActor.EMPLOYEE,
          cancellationReason: 'Estoy enfermo',
        }),
      ),
    );
    expect(await statuses(created.map(({ id }) => id))).toEqual([
      BookingStatus.BOOKED,
      BookingStatus.CANCELLED,
      BookingStatus.CANCELLED,
      BookingStatus.REJECTED,
    ]);
  }, 60_000);

  it('cancels by Enlace del Turno as the Cliente, whoever attends, and answers the Turnos with their data', async () => {
    const created = await serie(1, [6, 13, 20]);

    const cancelled = await repository.cancelSeriesFromByLink(
      created[0].seriesId!,
      created[1].startsAt,
      at(1, 0),
      null,
    );

    expect(cancelled.map(({ id }) => id)).toEqual([created[1].id, created[2].id]);
    expect(cancelled.every((b) => b.cancelledBy === BookingActor.CLIENT && b.service.name === tag)).toBe(true);
    expect(await statuses(created.map(({ id }) => id))).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CANCELLED,
      BookingStatus.CANCELLED,
    ]);
  }, 60_000);

  it('answers none when nothing is left to change', async () => {
    const created = await serie(1, [7, 14]);
    await repository.cancelSeriesFromByLink(created[0].seriesId!, created[0].startsAt, at(1, 0), null);

    expect(
      await repository.resolvePendingSeries(created[0].seriesId!, userIds[1], BookingStatus.BOOKED, at(1, 0), null),
    ).toEqual([]);
  }, 60_000);
});
