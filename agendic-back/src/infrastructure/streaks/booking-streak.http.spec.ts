import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { NotFoundError } from '../../domain/errors';
import { OwnedStreakPrize, StreakPrize } from '../../domain/streaks/streak-prize';
import {
  StreakProgram,
  StreakProgramOwner,
  StreakReward,
  StreakRewardType,
} from '../../domain/streaks/streak-program';
import { ClientFileBooking } from '../../domain/streaks/streak-prize';
import {
  ANA,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
} from '../../test-app';

const DAY_MS = 86_400_000;
/** The TestClock starts here. */
const NOW = new Date('2026-01-01T12:00:00.000Z');
const OWNER: StreakProgramOwner = { kind: 'business', businessId: ANAS_BUSINESS.id };

const BOOKED: Booking = {
  id: 7,
  serviceId: ANAS_SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  userId: ANAS_EMPLOYEE.userId,
  cabinId: null,
  clientName: 'Carla Gómez',
  clientEmail: 'Carla@Example.com',
  prepStartsAt: new Date('2026-01-02T13:50:00.000Z'),
  startsAt: new Date('2026-01-02T14:00:00.000Z'),
  endsAt: new Date('2026-01-02T14:30:00.000Z'),
  status: BookingStatus.BOOKED,
  notes: null,
  noShowAt: null,
  employeeNoShowAt: null,
  link: 'booking-link-secret',
  fromRescheduleId: null,
  seriesId: null,
  employeeChosen: false,
  depositAmount: null,
  depositPaidAt: null,
  price: 50,
  cancelledAt: null,
  rejectedAt: null,
  acceptedAt: null,
  cancelledBy: null,
  cancellationReason: null,
  cancellationCause: null,
};

const reward = (over: Partial<StreakReward> = {}): StreakReward => ({
  id: 7,
  requiredCount: 5,
  repeatable: false,
  type: StreakRewardType.GIFT,
  value: null,
  description: 'Un lavado',
  service: null,
  validForDays: null,
  ...over,
});

const program = (over: Partial<StreakProgram> = {}): StreakProgram => ({
  active: true,
  burnAfterDays: 30,
  rewards: [reward()],
  ...over,
});

/** A Turno atendido that started `days` days before NOW. */
const turno = (days: number): ClientFileBooking => {
  const startsAt = new Date(NOW.getTime() - days * DAY_MS);
  return {
    email: 'carla@example.com',
    clientName: 'Carla',
    link: `link-${days}`,
    timeZone: 'America/Argentina/Buenos_Aires',
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3_600_000),
    status: BookingStatus.BOOKED,
    noShowAt: null,
    employeeNoShowAt: null,
  };
};

const prize = (over: Partial<StreakPrize> = {}): StreakPrize => ({
  id: 3,
  type: StreakRewardType.GIFT,
  value: null,
  description: 'Un lavado',
  serviceName: null,
  grantedAt: new Date('2025-12-20T10:00:00.000Z'),
  expiresAt: null,
  redeemedAt: null,
  ...over,
});

const owned = (over: Partial<OwnedStreakPrize> = {}): OwnedStreakPrize => ({
  ...prize(),
  owner: OWNER,
  clientEmail: 'carla@example.com',
  ...over,
});

const PRESENTED_PRIZE = {
  id: 3,
  type: 'GIFT',
  value: null,
  description: 'Un lavado',
  serviceName: null,
  grantedAt: '2025-12-20T10:00:00.000Z',
  expiresAt: null,
};

describe('Racha en el detalle del Turno', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.bookings.findById.mockResolvedValue(BOOKED);
    t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
    t.streakPrizes.findOwnerByBookingId.mockResolvedValue(OWNER);
    t.streakPrizes.listAvailable.mockResolvedValue([]);
    t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(program());
    t.streakPrizes.listClientFileBookings.mockResolvedValue([turno(20), turno(10)]);
  });
  afterEach(() => t.app.close());

  describe('GET /bookings/:id/streak', () => {
    const get = (token: string | undefined = CLERK_TOKEN) => {
      const req = t.http.get(`/bookings/${BOOKED.id}/streak`);
      return token ? req.set(bearer(token)) : req;
    };

    it('muestra la Racha, hasta cuándo dura y la próxima Recompensa de la Ficha del Turno', async () => {
      const res = await get().expect(200);

      expect(res.body).toEqual({
        streak: { count: 2, burnsAt: new Date(turno(10).startsAt.getTime() + 30 * DAY_MS).toISOString() },
        nextReward: {
          reward: {
            id: 7,
            requiredCount: 5,
            repeatable: false,
            type: 'GIFT',
            value: null,
            description: 'Un lavado',
            service: null,
            validForDays: null,
          },
          remaining: 3,
        },
        prizes: [],
      });
      expect(t.streakPrizes.findOwnerByBookingId).toHaveBeenCalledWith(BOOKED.id);
    });

    it('busca la Ficha con el email en minúsculas', async () => {
      await get().expect(200);

      expect(t.streakPrizes.listClientFileBookings).toHaveBeenCalledWith(OWNER, ['carla@example.com']);
      expect(t.streakPrizes.listAvailable).toHaveBeenCalledWith(OWNER, 'carla@example.com', NOW);
    });

    it('en una Recompensa repetible, la próxima es el siguiente múltiplo', async () => {
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(
        program({ rewards: [reward({ requiredCount: 5, repeatable: true })] }),
      );
      t.streakPrizes.listClientFileBookings.mockResolvedValue([20, 18, 16, 14, 12, 10, 8].map(turno));

      const res = await get().expect(200);

      expect(res.body.streak.count).toBe(7);
      expect(res.body.nextReward.remaining).toBe(3);
    });

    it('con varias Recompensas, la de menor cantidad que la Racha todavía no alcanzó', async () => {
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(
        program({
          rewards: [
            reward({ id: 1, requiredCount: 2 }),
            reward({ id: 2, requiredCount: 10 }),
            reward({ id: 3, requiredCount: 4, repeatable: true }),
          ],
        }),
      );
      t.streakPrizes.listClientFileBookings.mockResolvedValue([20, 10, 5].map(turno));

      const res = await get().expect(200);

      expect(res.body.nextReward).toMatchObject({ reward: { id: 3 }, remaining: 1 });
    });

    it('si la Racha ya pasó todas las Recompensas de "una vez", no hay próxima', async () => {
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(program({ rewards: [reward({ requiredCount: 2 })] }));

      const res = await get().expect(200);

      expect(res.body.streak.count).toBe(2);
      expect(res.body.nextReward).toBeNull();
    });

    it('sin Racha en curso, la cuenta es 0 y falta la cantidad entera', async () => {
      t.streakPrizes.listClientFileBookings.mockResolvedValue([turno(100), turno(90)]);

      const res = await get().expect(200);

      expect(res.body.streak).toEqual({ count: 0, burnsAt: null });
      expect(res.body.nextReward.remaining).toBe(5);
    });

    it('lista los Premios disponibles, del más viejo al más nuevo, aunque el programa esté apagado', async () => {
      const older = prize({ id: 1, grantedAt: new Date('2025-12-01T10:00:00.000Z') });
      t.streakPrizes.listAvailable.mockResolvedValue([older, prize({ id: 2 })]);
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(program({ active: false }));

      const res = await get().expect(200);

      expect(res.body.streak).toBeNull();
      expect(res.body.nextReward).toBeNull();
      expect(res.body.prizes.map((p: { id: number }) => p.id)).toEqual([1, 2]);
      expect(res.body.prizes[1]).toEqual({ ...PRESENTED_PRIZE, id: 2 });
      expect(t.streakPrizes.listClientFileBookings).not.toHaveBeenCalled();
    });

    it.each([
      ['sin Recompensas', program({ rewards: [] })],
      ['sin Tiempo de quemada', program({ burnAfterDays: null })],
      ['sin programa', null],
    ])('%s: la Racha es nula', async (_case, found) => {
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(found);
      t.streakPrizes.listAvailable.mockResolvedValue([prize()]);

      const res = await get().expect(200);

      expect(res.body).toEqual({ streak: null, nextReward: null, prizes: [PRESENTED_PRIZE] });
    });

    it('en un Servicio personal usa la Ficha del Usuario', async () => {
      const personal: StreakProgramOwner = { kind: 'personal', userId: ANA.id };
      t.streakPrizes.findOwnerByBookingId.mockResolvedValue(personal);

      await get().expect(200);

      expect(t.streakPrograms.findByOwnerIncludeRewards).toHaveBeenCalledWith(personal);
    });

    it('answers 404 when the Turno does not exist', async () => {
      t.bookings.findById.mockRejectedValue(new NotFoundError('Booking 7 not found'));

      await get().expect(404);
    });

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      await get(OTHER_CLERK_TOKEN).expect(403);

      expect(t.streakPrizes.listAvailable).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await get('').expect(401);
    });
  });

  describe('PATCH /bookings/:id/redeem-prize', () => {
    const patch = (body: unknown = { prizeId: 3 }, token: string | undefined = CLERK_TOKEN) => {
      const req = t.http.patch(`/bookings/${BOOKED.id}/redeem-prize`).send(body as object);
      return token ? req.set(bearer(token)) : req;
    };

    beforeEach(() => {
      t.streakPrizes.findById.mockResolvedValue(owned());
      t.streakPrizes.redeem.mockImplementation(async () => prize({ redeemedAt: NOW }));
    });

    it('Canjea el Premio y lo devuelve con la hora del Canje', async () => {
      const res = await patch().expect(200);

      expect(t.streakPrizes.redeem).toHaveBeenCalledWith(3, BOOKED.id, ANA.id, NOW);
      expect(res.body).toEqual({ ...PRESENTED_PRIZE, redeemedAt: NOW.toISOString() });
    });

    it('se puede Canjear en un Turno de cualquier Servicio de la misma Ficha', async () => {
      t.bookings.findById.mockResolvedValue({ ...BOOKED, serviceId: 99 });

      await patch().expect(200);
    });

    it('con un Premio que vence más adelante lo Canjea', async () => {
      t.streakPrizes.findById.mockResolvedValue(owned({ expiresAt: new Date(NOW.getTime() + 1) }));

      await patch().expect(200);
    });

    it('answers 404 when the Premio does not exist', async () => {
      t.streakPrizes.findById.mockResolvedValue(null);

      const res = await patch().expect(404);

      expect(res.body.message).toBe('Prize 3 not found');
    });

    it('answers 404 when the Turno does not exist', async () => {
      t.bookings.findById.mockRejectedValue(new NotFoundError('Booking 7 not found'));

      await patch().expect(404);
      expect(t.streakPrizes.redeem).not.toHaveBeenCalled();
    });

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      await patch({ prizeId: 3 }, OTHER_CLERK_TOKEN).expect(403);

      expect(t.streakPrizes.redeem).not.toHaveBeenCalled();
    });

    it.each([BookingStatus.PENDING, BookingStatus.CANCELLED, BookingStatus.REJECTED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, status });

        const res = await patch().expect(422);

        expect(res.body.message).toBe('Booking 7 is not accepted');
        expect(t.streakPrizes.redeem).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['otro email', owned({ clientEmail: 'dani@example.com' })],
      ['otro Negocio', owned({ owner: { kind: 'business', businessId: 99 } })],
      ['los Servicios personales', owned({ owner: { kind: 'personal', userId: ANA.id } })],
    ])('answers 422 when the Premio is of %s', async (_case, other) => {
      t.streakPrizes.findById.mockResolvedValue(other);

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Prize 3 belongs to another Ficha del Cliente');
      expect(t.streakPrizes.redeem).not.toHaveBeenCalled();
    });

    it('answers 422 when the Premio expired, also at the exact moment', async () => {
      t.streakPrizes.findById.mockResolvedValue(owned({ expiresAt: NOW }));

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Prize 3 expired');
      expect(t.streakPrizes.redeem).not.toHaveBeenCalled();
    });

    it('answers 409 when the Premio was already Canjeado', async () => {
      t.streakPrizes.findById.mockResolvedValue(owned({ redeemedAt: new Date('2025-12-30T10:00:00.000Z') }));

      const res = await patch().expect(409);

      expect(res.body.message).toBe('Prize 3 already redeemed');
      expect(t.streakPrizes.redeem).not.toHaveBeenCalled();
    });

    it('answers 409 when another Canje won the write', async () => {
      const { ConflictError } = await import('../../domain/errors');
      t.streakPrizes.redeem.mockRejectedValue(new ConflictError('Prize 3 already redeemed'));

      const res = await patch().expect(409);

      expect(res.body.message).toBe('Prize 3 already redeemed');
    });

    it.each([[{}], [{ prizeId: 'x' }], [{ prizeId: 1.5 }]])('answers 400 for the body %j', async (body) => {
      await patch(body).expect(400);
    });

    it('answers 401 without a Sesión', async () => {
      await patch({ prizeId: 3 }, '').expect(401);
    });
  });
});
