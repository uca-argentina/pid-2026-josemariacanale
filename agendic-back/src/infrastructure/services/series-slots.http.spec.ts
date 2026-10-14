import { Availability } from '../../domain/availabilities/availability';
import {
  OutOfOffice,
  OutOfOfficeReason,
} from '../../domain/out-of-office/out-of-office';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

const SERVICE = { ...ANAS_SERVICE, repeatEveryWeeks: 1, repeatMaxBookings: 4 };
const AVAILABILITY_ID = 10;
const AVAILABILITY: Availability = {
  id: AVAILABILITY_ID,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: ANAS_BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};
const BEA = {
  ...SERVICE.employees[0],
  id: 2,
  userId: 99,
  name: 'Bea',
  slug: 'bea',
};

/** Mondays 09:00 in Buenos Aires: 2026-01-05, 12, 19, 26. */
const MONDAYS = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
const FIRST = '2026-01-05T12:00:00.000Z';
const at = (date: string) => `${date}T12:00:00.000Z`;

describe('GET /services/:id/series-slots', () => {
  let t: TestApp;
  const get = (params: Record<string, string | number> = {}) =>
    t.http.get(
      `/services/${SERVICE.id}/series-slots?` +
        Object.entries({ startsAt: FIRST, count: 3, ...params })
          .map(([k, v]) => `${k}=${v}`)
          .join('&'),
    );

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockResolvedValue(SERVICE);
    t.branches.findById.mockResolvedValue(ANAS_BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByUser.mockResolvedValue([]);
  });
  afterEach(() => t.app.close());

  it('lista las fechas de la Serie, todas disponibles si nada choca', async () => {
    const res = await get().expect(200);

    expect(res.body).toEqual({
      employeeId: ANAS_EMPLOYEE.id,
      dates: MONDAYS.slice(0, 3).map((date) => ({
        date,
        startsAt: at(date),
        available: true,
      })),
    });
  });

  describe('marca un choque', () => {
    const availability = async () => (await get().expect(200)).body.dates.map((d: { available: boolean }) => d.available);

    it('por un Turno tomado', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date(at('2026-01-12')), endsAt: new Date('2026-01-12T12:30:00.000Z') },
      ]);

      expect(await availability()).toEqual([true, false, true]);
    });

    it('por Fuera de la oficina', async () => {
      const period: OutOfOffice = {
        id: 1,
        userId: ANAS_EMPLOYEE.userId,
        startDate: '2026-01-19',
        endDate: '2026-01-19',
        reason: OutOfOfficeReason.VACATION,
        notes: null,
        showNotePublicly: false,
      };
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([period]);

      expect(await availability()).toEqual([true, true, false]);
    });

    it('por un Día festivo', async () => {
      t.userHolidaySettings.findByUserId.mockResolvedValue({
        countryCode: 'AR',
        disabledIds: [],
      });
      t.holidays.findLatestUpdatedAt.mockResolvedValue(t.clock.now());
      t.holidays.listByCountryCodeAndYear.mockResolvedValue([
        {
          countryCode: 'AR',
          calendarId: 'cal',
          eventId: 'feriado',
          name: 'Feriado',
          date: new Date('2026-01-12T00:00:00.000Z'),
          year: 2026,
        },
      ]);

      expect(await availability()).toEqual([true, false, true]);
    });

    it('por el Límite diario', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 1 });
      t.bookings.listOccupiedStartsByService.mockResolvedValue([
        new Date('2026-01-19T15:00:00.000Z'),
      ]);

      expect(await availability()).toEqual([true, true, false]);
    });

    it('por falta de Cabina libre', async () => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        cabins: [{ id: 10, name: 'Box 1' }],
      });
      t.bookings.listOccupiedByCabins.mockResolvedValue([
        {
          cabinId: 10,
          prepStartsAt: new Date(at('2026-01-12')),
          endsAt: new Date('2026-01-12T12:30:00.000Z'),
        },
      ]);

      expect(await availability()).toEqual([true, false, true]);
    });
  });

  describe('Empleado de la Serie', () => {
    beforeEach(() => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        employees: [...SERVICE.employees, BEA],
      });
      // Ana is booked on the second Monday; Bea is free every week.
      t.bookings.listOccupiedByUser.mockImplementation(async (userId) =>
        userId === ANAS_EMPLOYEE.userId
          ? [
              {
                prepStartsAt: new Date(at('2026-01-12')),
                endsAt: new Date('2026-01-12T12:30:00.000Z'),
              },
            ]
          : [],
      );
      t.bookings.lastReceivedByEmployee.mockResolvedValue(new Map());
    });

    it('con employeeId, todas las fechas son de ese Empleado', async () => {
      const res = await get({ employeeId: ANAS_EMPLOYEE.id }).expect(200);

      expect(res.body.employeeId).toBe(ANAS_EMPLOYEE.id);
      expect(res.body.dates.map((d: { available: boolean }) => d.available)).toEqual([true, false, true]);
    });

    it('con "cualquiera" elige al libre en más fechas', async () => {
      const res = await get().expect(200);

      expect(res.body.employeeId).toBe(BEA.id);
      expect(res.body.dates.every((d: { available: boolean }) => d.available)).toBe(true);
    });

    it('si empatan, al que hace más tiempo que no recibe un Turno del Servicio', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([]);
      t.bookings.lastReceivedByEmployee.mockResolvedValue(
        new Map([
          [ANAS_EMPLOYEE.id, new Date('2026-01-01T10:00:00.000Z')],
          [BEA.id, new Date('2025-12-01T10:00:00.000Z')],
        ]),
      );

      expect((await get().expect(200)).body.employeeId).toBe(BEA.id);
    });
  });

  describe('errores', () => {
    it('422 si el Servicio no tiene Repetición', async () => {
      t.services.findById.mockResolvedValue(ANAS_SERVICE);

      const res = await get().expect(422);

      expect(res.body.message).toBe(`Service ${SERVICE.id} has no Repetición`);
    });

    it.each([1, 5])('400 si count es %i', async (count) => {
      const res = await get({ count }).expect(400);

      expect(res.body.message).toBe('count must be between 2 and 4');
    });

    it('422 si el primer horario no es reservable', async () => {
      const res = await get({ startsAt: '2026-01-05T03:00:00.000Z' }).expect(422);

      expect(res.body.message).toBe(
        `Slot 2026-01-05T03:00:00.000Z is not available for Service ${SERVICE.id}`,
      );
    });

    it('404 si el Servicio no existe', async () => {
      t.services.findById.mockResolvedValue(null);

      await get().expect(404);
    });

    it('400 si startsAt no es una fecha', async () => {
      await get({ startsAt: 'ayer' }).expect(400);
    });
  });
});
