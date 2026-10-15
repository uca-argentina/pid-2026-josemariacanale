import 'dotenv/config';
import { AliveWaitlistEntry } from '../../../domain/waitlist/waitlist-entry';
import {
  BookingStatus,
  ServiceCategory,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaWaitlistRepository } from '../prisma-waitlist.repository';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

/** Runs against the real database: the day boundary in the Servicio's zone and the email case are SQL rules. */
describe('PrismaWaitlistRepository.listWithLiveBooking (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaWaitlistRepository(prisma);
  const tag = `waitlist-${Date.now()}`;
  let userId: number;
  let serviceId: number;
  let otherServiceId: number;

  const makeService = (suffix: string) =>
    prisma.service.create({
      data: {
        userId,
        name: `${tag}-${suffix}`,
        slug: `${tag}-${suffix}`,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 100,
      },
    });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        clerkId: tag,
        name: tag,
        email: `${tag}@example.com`,
      },
    });
    userId = user.id;
    serviceId = (await makeService('a')).id;
    otherServiceId = (await makeService('b')).id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId } });
    await prisma.service.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  /** A Turno of `email` starting at `startsAt` (UTC ISO) in `service`. */
  const book = async (
    email: string,
    startsAt: string,
    status: BookingStatus = BookingStatus.BOOKED,
    service = serviceId,
  ) => {
    const start = new Date(startsAt);
    await prisma.booking.create({
      data: {
        serviceId: service,
        userId,
        prepStartsAt: start,
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60 * 1000),
        status,
        price: 100,
        client: { create: { name: 'Carla', email } },
      },
    });
  };

  const entry = (over: Partial<AliveWaitlistEntry> = {}) =>
    ({
      id: 1,
      serviceId,
      date: '2031-03-10',
      email: 'carla@example.com',
      timeZone: BUENOS_AIRES,
      ...over,
    }) as AliveWaitlistEntry;

  afterEach(() => prisma.booking.deleteMany({ where: { userId } }));

  it('returns nothing for an empty list', async () => {
    expect(await repository.listWithLiveBooking([])).toEqual(new Set());
  });

  it('finds BOOKED and PENDING Turnos, ignoring the email case', async () => {
    await book('Carla@Example.com', '2031-03-10T15:00:00.000Z');
    await book(
      'dani@example.com',
      '2031-03-10T16:00:00.000Z',
      BookingStatus.PENDING,
    );

    const found = await repository.listWithLiveBooking([
      entry(),
      entry({ id: 2, email: 'dani@example.com' }),
      entry({ id: 3, email: 'otra@example.com' }),
    ]);

    expect(found).toEqual(new Set([1, 2]));
  });

  it('cuts the day in the Servicio zone: 23:30 local is that day, 00:30 the next is not', async () => {
    // Buenos Aires is UTC-3: 23:30 local on the 10th is 02:30 UTC on the 11th.
    await book('carla@example.com', '2031-03-11T02:30:00.000Z');
    expect(await repository.listWithLiveBooking([entry()])).toEqual(
      new Set([1]),
    );

    await prisma.booking.deleteMany({ where: { userId } });
    // 00:30 local on the 11th is 03:30 UTC on the 11th.
    await book('carla@example.com', '2031-03-11T03:30:00.000Z');
    expect(await repository.listWithLiveBooking([entry()])).toEqual(new Set());
  });

  it('ignores CANCELLED and REJECTED Turnos', async () => {
    await book(
      'carla@example.com',
      '2031-03-10T15:00:00.000Z',
      BookingStatus.CANCELLED,
    );
    await book(
      'carla@example.com',
      '2031-03-10T16:00:00.000Z',
      BookingStatus.REJECTED,
    );

    expect(await repository.listWithLiveBooking([entry()])).toEqual(new Set());
  });

  it('ignores a Turno of another Servicio or another date', async () => {
    await book(
      'carla@example.com',
      '2031-03-10T15:00:00.000Z',
      BookingStatus.BOOKED,
      otherServiceId,
    );
    await book('carla@example.com', '2031-03-12T15:00:00.000Z');

    expect(await repository.listWithLiveBooking([entry()])).toEqual(new Set());
  });
});
