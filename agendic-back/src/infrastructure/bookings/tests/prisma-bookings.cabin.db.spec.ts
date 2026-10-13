import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { ConflictError } from '../../../domain/errors';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: Booking_cabin_no_overlap is Postgres's job (ADR 0004, 0030). */
describe('PrismaBookingsRepository, Cabinas (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `booking-cabin-${Date.now()}`;
  const userIds: number[] = [];
  let businessId: number;
  let serviceId: number;
  let box: number;
  let laser: number;

  /** A Turno on 2031-01-01 from `prep` to `end` (UTC hours, fractions allowed); `user` picks whose agenda it holds. */
  const book = (
    user: number,
    cabinId: number | null,
    prep: number,
    start: number,
    end: number,
  ) => {
    const at = (hours: number) => new Date(Date.UTC(2031, 0, 1) + hours * 3_600_000);
    return repository.create({
      serviceId,
      employeeId: null,
      userId: userIds[user],
      cabinId,
      clientName: 'Bruno',
      clientEmail: `${tag}@example.com`,
      prepStartsAt: at(prep),
      startsAt: at(start),
      endsAt: at(end),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 50,
      status: BookingStatus.BOOKED,
      acceptedAt: new Date(),
    });
  };

  beforeAll(async () => {
    for (const n of [0, 1, 2, 3])
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
        data: {
          branchId,
          name: tag,
          slug: tag,
          category: 'SPA',
          durationMinutes: 60,
          price: 1,
        },
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

  it('rejects two overlapping Turnos in the same Cabina, preparation included, as the busy-horario ConflictError', async () => {
    // 10:00–11:00 with 15 minutes of preparation: the Cabina is held from 09:45.
    const first = await book(0, box, 9.75, 10, 11);

    await expect(book(1, box, 10, 10.5, 11.5)).rejects.toThrow(ConflictError);
    // Ends 09:50, inside the preparation of the first.
    await expect(book(1, box, 8, 9, 9 + 50 / 60)).rejects.toThrow(ConflictError);
    expect(first.cabinId).toBe(box);
  }, 60_000);

  it('accepts a Turno that touches the first, another Cabina at the same time, and one without Cabina', async () => {
    // The first Turno holds box from 09:45 to 11:00 (see above): these touch it at either end.
    await expect(book(1, box, 8.75, 9, 9.75)).resolves.toMatchObject({ cabinId: box });
    await expect(book(2, box, 11, 11.25, 12)).resolves.toMatchObject({ cabinId: box });
    await expect(book(3, laser, 9.75, 10, 11)).resolves.toMatchObject({ cabinId: laser });
    await expect(book(1, null, 20, 21, 22)).resolves.toMatchObject({ cabinId: null });
    await expect(book(2, null, 20, 21, 22)).resolves.toMatchObject({ cabinId: null });
  }, 60_000);

  it('accepts a Turno on top of a cancelled one', async () => {
    const cancelled = await book(0, laser, 14, 14.25, 15);
    await repository.cancel(cancelled.id, new Date(), null);

    await expect(book(1, laser, 14, 14.25, 15)).resolves.toMatchObject({ cabinId: laser });
  }, 60_000);

  it('moves a Turno to another Cabina on reschedule and shows the Cabina by name in the panel, even once dada de baja', async () => {
    const turno = await book(0, box, 5, 5, 6);
    const at = (hours: number) => new Date(Date.UTC(2031, 0, 1) + hours * 3_600_000);

    const moved = await repository.reschedule(turno.id, {
      employeeId: null,
      userId: userIds[0],
      cabinId: laser,
      prepStartsAt: at(7),
      startsAt: at(7),
      endsAt: at(8),
    }, new Date());

    expect(moved).toMatchObject({ cabinId: laser, cabin: { id: laser, name: 'Láser' } });
    await prisma.cabin.update({ where: { id: laser }, data: { deletedAt: new Date() } });
    const mine = await repository.listByUser(userIds[0]);
    expect(mine.find(({ id }) => id === moved.id)?.cabin).toEqual({ id: laser, name: 'Láser' });
    await prisma.cabin.update({ where: { id: laser }, data: { deletedAt: null } });
  }, 60_000);

  it('lists the occupied tramos of the Cabinas, counts the upcoming ones and finds when each last received a Turno', async () => {
    const from = new Date(Date.UTC(2031, 0, 1, 9));
    const to = new Date(Date.UTC(2031, 0, 1, 12));

    const occupied = await repository.listOccupiedByCabins([box], from, to);

    expect(occupied.map(({ cabinId }) => cabinId)).toEqual([box, box, box]);
    const starts = occupied.map(({ prepStartsAt }) => prepStartsAt.getTime());
    expect(starts).toEqual([...starts].sort((x, y) => x - y));
    await expect(
      repository.countUpcomingByCabin(box, new Date(Date.UTC(2031, 0, 1, 10, 30))),
    ).resolves.toBe(2); // the one ending 11:00 and the one ending 12:00; the one ending 09:45 is over
    await expect(
      repository.countUpcomingByCabin(box, new Date(Date.UTC(2031, 0, 1, 12))),
    ).resolves.toBe(0);
    const last = await repository.lastReceivedByCabin([box, laser]);
    expect([...last.keys()].sort((x, y) => x - y)).toEqual([box, laser].sort((x, y) => x - y));
  }, 60_000);
});
