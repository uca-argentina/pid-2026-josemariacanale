import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { SeriesBookingData } from '../../../domain/bookings/bookings.repository';
import { ConflictError } from '../../../domain/errors';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: the all-or-nothing and the retry on a busy Cabina are Postgres's job (ADR 0004, 0030). */
describe('PrismaBookingsRepository, Serie (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `booking-series-${Date.now()}`;
  const userIds: number[] = [];
  let businessId: number;
  let serviceId: number;
  let box: number;
  let laser: number;

  /** UTC hours on 2032-01-<day>. */
  const at = (day: number, hours: number) =>
    new Date(Date.UTC(2032, 0, day) + hours * 3_600_000);

  const item = (
    user: number,
    day: number,
    cabinIds: number[],
    hours = 10,
  ): SeriesBookingData => ({
    date: `2032-01-${String(day).padStart(2, '0')}`,
    cabinIds,
    data: {
      serviceId,
      employeeId: null,
      userId: userIds[user],
      clientName: 'Bruno',
      clientEmail: `${tag}@example.com`,
      prepStartsAt: at(day, hours),
      startsAt: at(day, hours),
      endsAt: at(day, hours + 1),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 50,
      status: BookingStatus.BOOKED,
      acceptedAt: new Date(),
    },
  });

  /** A Turno suelto that holds `cabinId` (and the agenda of `user`) on `day`. */
  const occupy = (user: number, day: number, cabinId: number | null) =>
    repository.create({ ...item(user, day, []).data, cabinId });

  beforeAll(async () => {
    for (const n of [0, 1, 2])
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
    box = (await prisma.cabin.create({ data: { branchId, name: 'Box' } })).id;
    laser = (await prisma.cabin.create({ data: { branchId, name: 'Láser' } })).id;
  }, 60_000);

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cabin.deleteMany({ where: { id: { in: [box, laser] } } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.branch.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('creates every Turno with one seriesId and a link of its own, and repeats the Cabina', async () => {
    const created = await repository.createSeries([
      item(0, 2, [box, laser]),
      item(0, 9, [box, laser]),
      item(0, 16, [box, laser]),
    ]);

    expect(created.map(({ startsAt }) => startsAt)).toEqual([at(2, 10), at(9, 10), at(16, 10)]);
    expect(new Set(created.map(({ seriesId }) => seriesId)).size).toBe(1);
    expect(created[0].seriesId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Set(created.map(({ link }) => link)).size).toBe(3);
    expect(created.map(({ cabinId }) => cabinId)).toEqual([box, box, box]);
  }, 60_000);

  it('takes another Cabina for a date where the first is busy, and goes back to the previous one after', async () => {
    await occupy(1, 4, box);

    const created = await repository.createSeries([
      item(0, 3, [box, laser]),
      item(0, 4, [box, laser]),
      item(0, 5, [box, laser]),
    ]);

    expect(created.map(({ cabinId }) => cabinId)).toEqual([box, laser, laser]);
  }, 60_000);

  it('creates none and names every date that fails when no Cabina is free', async () => {
    await occupy(1, 7, box);
    await occupy(2, 8, box);
    const before = await prisma.booking.count({ where: { userId: userIds[0] } });

    const error = await repository
      .createSeries([
        item(0, 6, [box]),
        item(0, 7, [box]),
        item(0, 8, [box]),
      ])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as Error).message).toBe('Series dates not available: 2032-01-07,2032-01-08');
    expect(await prisma.booking.count({ where: { userId: userIds[0] } })).toBe(before);
  }, 60_000);

  it('creates none when the Empleado is busy on a date, whatever the Cabinas', async () => {
    await occupy(0, 11, null);
    const before = await prisma.booking.count({ where: { userId: userIds[0] } });

    await expect(
      repository.createSeries([item(0, 10, [box, laser]), item(0, 11, [box, laser])]),
    ).rejects.toThrow('Series dates not available: 2032-01-11');

    expect(await prisma.booking.count({ where: { userId: userIds[0] } })).toBe(before);
  }, 60_000);

  it('rescheduling a Turno of the Serie leaves the new one in it', async () => {
    const [first] = await repository.createSeries([item(0, 20, [box]), item(0, 27, [box])]);

    const moved = await repository.reschedule(
      first.id,
      {
        employeeId: null,
        userId: userIds[0],
        cabinId: box,
        prepStartsAt: at(21, 10),
        startsAt: at(21, 10),
        endsAt: at(21, 11),
      },
      new Date(),
    );

    expect(moved.seriesId).toBe(first.seriesId);
  }, 60_000);
});
