import { emptySchedule, Schedule } from '../availabilities/availability';
import {
  bookingsLeftOutside,
  BookingTramo,
  ScheduleAvailability,
  UserSchedule,
} from './bookings-left-outside';

const BA = 'America/Argentina/Buenos_Aires'; // UTC-3, no daylight saving

/** Monday to Friday with the given ranges. */
const weekdays = (...ranges: [string, string][]): Schedule =>
  emptySchedule().map((_, day) =>
    day >= 1 && day <= 5 ? ranges.map(([start, end]) => ({ start, end })) : [],
  );

const allDays = (): Schedule =>
  emptySchedule().map(() => [{ start: '00:00', end: '23:59' }]);

const availability = (
  schedule: Schedule,
  extra: Partial<ScheduleAvailability> = {},
): ScheduleAvailability => ({
  id: 1,
  timeZone: BA,
  schedule,
  overrides: [],
  ...extra,
});

const horario = (
  a: ScheduleAvailability[],
  blocked: UserSchedule['blocked'] = [],
): UserSchedule => ({ availabilities: a, blocked });

/** A Turno on `date` (Monday 2031-01-06 by default) from local `from` to `to` in Buenos Aires; `from` includes any preparation. */
const turno = (
  from: string,
  to: string,
  extra: Partial<BookingTramo> & { id?: number } = {},
  date = '2031-01-06',
) => ({
  id: 1,
  availabilityId: 1,
  prepStartsAt: new Date(`${date}T${from}:00-03:00`),
  endsAt: new Date(`${date}T${to}:00-03:00`),
  ...extra,
});

const ids = (r: { booking: { id: number } }[]) => r.map((x) => x.booking.id);

describe('bookingsLeftOutside', () => {
  const nine = horario([availability(weekdays(['09:00', '17:00']))]);

  it('returns a Turno whose Franja shrinks, with its local date', () => {
    const smaller = horario([availability(weekdays(['09:00', '12:00']))]);

    const result = bookingsLeftOutside([turno('14:00', '15:00')], nine, smaller);

    expect(result).toEqual([
      { booking: expect.objectContaining({ id: 1 }), date: '2031-01-06' },
    ]);
  });

  it('keeps a Turno that is still inside', () => {
    const smaller = horario([availability(weekdays(['09:00', '12:00']))]);

    expect(
      bookingsLeftOutside([turno('10:00', '11:00')], nine, smaller),
    ).toEqual([]);
  });

  it('does not return a Turno that was already outside before', () => {
    const smaller = horario([availability(weekdays(['09:00', '12:00']))]);

    expect(
      bookingsLeftOutside([turno('18:00', '19:00')], nine, smaller),
    ).toEqual([]);
  });

  it('leaves out a Turno on a día libre Anulación, and uses the hours of one with hours', () => {
    const dayOff = horario([
      availability(weekdays(['09:00', '17:00']), {
        overrides: [{ date: '2031-01-06', ranges: [] }],
      }),
    ]);
    const shortDay = horario([
      availability(weekdays(['09:00', '17:00']), {
        overrides: [
          { date: '2031-01-06', ranges: [{ start: '09:00', end: '10:00' }] },
        ],
      }),
    ]);
    const turnos = [
      turno('09:00', '10:00', { id: 1 }),
      turno('15:00', '16:00', { id: 2 }),
    ];

    expect(ids(bookingsLeftOutside(turnos, nine, dayOff))).toEqual([1, 2]);
    expect(ids(bookingsLeftOutside(turnos, nine, shortDay))).toEqual([2]);
  });

  it('lets a Franja ending at 23:59 reach midnight', () => {
    const late = horario([availability(weekdays(['20:00', '23:59']))]);
    const early = horario([availability(weekdays(['20:00', '23:00']))]);
    const t = turno('23:00', '23:00', {
      endsAt: new Date('2031-01-07T00:00:00-03:00'),
    });

    expect(bookingsLeftOutside([t], late, early)).toHaveLength(1);
    expect(bookingsLeftOutside([t], late, late)).toEqual([]);
  });

  it('counts the Tiempo de preparación: a Turno whose preparation leaves the Franja is outside', () => {
    const starts9 = horario([availability(weekdays(['09:00', '12:00']))]);
    const starts10 = horario([availability(weekdays(['10:00', '12:00']))]);
    // 10:00–11:00 with 30 minutes of preparation from 09:30.
    const t = turno('09:30', '11:00');

    expect(bookingsLeftOutside([t], starts9, starts10)).toHaveLength(1);
  });

  it('leaves out a Turno that crosses two adjacent Franjas', () => {
    const joined = horario([availability(weekdays(['09:00', '17:00']))]);
    const split = horario([
      availability(weekdays(['09:00', '12:00'], ['12:00', '17:00'])),
    ]);

    expect(
      bookingsLeftOutside([turno('11:30', '12:30')], joined, split),
    ).toHaveLength(1);
  });

  it('reads a change of time zone: the same wall clock is another instant', () => {
    const madrid = horario([
      availability(weekdays(['09:00', '17:00']), { timeZone: 'Europe/Madrid' }),
    ]);
    const tokyo = horario([
      availability(weekdays(['09:00', '17:00']), { timeZone: 'Asia/Tokyo' }),
    ]);
    // 10:00–11:00 in Buenos Aires is 14:00–15:00 in Madrid (inside) and 22:00–23:00 in Tokyo (outside).
    const t = turno('10:00', '11:00');

    expect(bookingsLeftOutside([t], madrid, tokyo)).toEqual([
      { booking: t, date: '2031-01-06' },
    ]);
  });

  it('reports the new local date when a zone change moves the Turno onto a day Fuera de la oficina', () => {
    const blocked = [{ startDate: '2031-01-07', endDate: '2031-01-07' }];
    // 22:00 on Monday the 6th in Buenos Aires is already Tuesday the 7th in Tokyo.
    const t = turno('22:00', '23:00');

    const result = bookingsLeftOutside(
      [t],
      horario([availability(allDays())], blocked),
      horario([availability(allDays(), { timeZone: 'Asia/Tokyo' })], blocked),
    );

    expect(result).toEqual([{ booking: t, date: '2031-01-07' }]);
  });

  it('reads a período on the local date, not the UTC one', () => {
    // 22:00 in Buenos Aires on the 6th is the 7th in UTC.
    const t = turno('22:00', '23:00');
    const open = horario([availability(allDays())]);

    const onUtcDate = horario(open.availabilities, [
      { startDate: '2031-01-07', endDate: '2031-01-07' },
    ]);
    const onLocalDate = horario(open.availabilities, [
      { startDate: '2031-01-06', endDate: '2031-01-06' },
    ]);

    expect(bookingsLeftOutside([t], open, onUtcDate)).toEqual([]);
    expect(bookingsLeftOutside([t], open, onLocalDate)).toHaveLength(1);
  });

  it('follows Madrid across the daylight-saving change', () => {
    const madrid = (end: string) =>
      horario([
        availability(weekdays(['09:00', end]), { timeZone: 'Europe/Madrid' }),
      ]);
    // Monday 2031-03-31 is the first day of summer time (UTC+2); the 24th is still UTC+1.
    const winter = {
      id: 1,
      availabilityId: 1,
      prepStartsAt: new Date('2031-03-24T15:00:00+01:00'),
      endsAt: new Date('2031-03-24T16:00:00+01:00'),
    };
    const summer = {
      id: 2,
      availabilityId: 1,
      prepStartsAt: new Date('2031-03-31T15:00:00+02:00'),
      endsAt: new Date('2031-03-31T16:00:00+02:00'),
    };
    const turnos = [winter, summer];

    expect(
      bookingsLeftOutside(turnos, madrid('17:00'), madrid('15:30')).map(
        (r) => r.date,
      ),
    ).toEqual(['2031-03-24', '2031-03-31']);
    expect(
      bookingsLeftOutside(turnos, madrid('17:00'), madrid('16:00')),
    ).toEqual([]);
  });

  it('joins overlapping períodos and includes their edges', () => {
    const open = horario([availability(weekdays(['09:00', '17:00']))]);
    const blocked = [
      { startDate: '2031-01-08', endDate: '2031-01-10' },
      { startDate: '2031-01-06', endDate: '2031-01-08' },
      { startDate: '2031-01-09', endDate: '2031-01-09' },
    ];
    const turnos = [
      turno('10:00', '11:00', { id: 1 }, '2031-01-03'), // Friday, before the first
      turno('10:00', '11:00', { id: 2 }, '2031-01-06'), // first edge
      turno('10:00', '11:00', { id: 3 }, '2031-01-08'), // inside both
      turno('10:00', '11:00', { id: 4 }, '2031-01-10'), // last edge
    ];

    expect(
      ids(
        bookingsLeftOutside(turnos, open, horario(open.availabilities, blocked)),
      ),
    ).toEqual([2, 3, 4]);
  });

  it('leaves out a Turno on a one-day Día festivo', () => {
    const open = horario([availability(weekdays(['09:00', '17:00']))]);
    const holiday = horario(open.availabilities, [
      { startDate: '2031-01-06', endDate: '2031-01-06' },
    ]);

    expect(
      bookingsLeftOutside([turno('10:00', '11:00')], open, holiday),
    ).toHaveLength(1);
  });

  it('leaves out a Turno of an unknown Availability, but not one that was never inside', () => {
    const t = turno('10:00', '11:00', { availabilityId: 99 });
    const withIt = horario([
      availability(weekdays(['09:00', '17:00']), { id: 99 }),
    ]);

    expect(bookingsLeftOutside([t], withIt, nine)).toHaveLength(1);
    expect(bookingsLeftOutside([t], nine, withIt)).toEqual([]);
  });

  it('handles about 10k Turnos without going quadratic', () => {
    const turnos = Array.from({ length: 10_000 }, (_, i) => {
      const start = new Date(Date.UTC(2031, 0, 6 + (i % 300), 13));
      return {
        id: i,
        availabilityId: 1,
        prepStartsAt: start,
        endsAt: new Date(start.getTime() + 3_600_000),
      };
    });
    const blocked = Array.from({ length: 200 }, (_, i) => {
      const date = new Date(Date.UTC(2031, 0, 1 + i * 2))
        .toISOString()
        .slice(0, 10);
      return { startDate: date, endDate: date };
    });
    const open = horario([availability(allDays())]);

    const started = Date.now();
    const result = bookingsLeftOutside(
      turnos,
      open,
      horario(open.availabilities, blocked),
    );

    expect(Date.now() - started).toBeLessThan(5_000);
    expect(result.length).toBeGreaterThan(0);
  });
});
