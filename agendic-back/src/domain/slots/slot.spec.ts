import { computeSlots, ComputeSlotsInput } from './slot';

const week = (start: string, end: string) =>
  Array.from({ length: 7 }, () => [{ start, end }]);

const base = (overrides: Partial<ComputeSlotsInput>): ComputeSlotsInput => ({
  from: '2026-03-29',
  to: '2026-03-29',
  timeZone: 'Europe/Madrid',
  availability: {
    timeZone: 'Europe/Madrid',
    schedule: week('01:00', '05:00'),
    overrides: [],
  },
  bookedRanges: [],
  durationMinutes: 60,
  prepMinutes: 0,
  slotInterval: null,
  minimumNoticeMinutes: 0,
  fullDates: new Set(),
  now: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
});

describe('computeSlots', () => {
  it('en el día del cambio de horario de verano, los Horarios reservables siguen el tiempo real', () => {
    // Europe/Madrid, 2026-03-29: 02:00 CET jumps to 03:00 CEST, so 01:00–05:00 lasts three hours.
    const [day] = computeSlots(base({}));

    expect(day.slots).toEqual([
      '2026-03-29T00:00:00.000Z', // 01:00 CET
      '2026-03-29T01:00:00.000Z', // 03:00 CEST
      '2026-03-29T02:00:00.000Z', // 04:00 CEST, ends at 05:00 CEST
    ]);
  });

  it('una Availability de otra zona produce instantes correctos y el día es el de la Sucursal', () => {
    // 09:00–13:00 in New York (UTC-5) is 14:00Z–18:00Z, which is 11:00–15:00 in Buenos Aires (UTC-3).
    const [day] = computeSlots(
      base({
        from: '2026-01-05',
        to: '2026-01-05',
        timeZone: 'America/Argentina/Buenos_Aires',
        now: new Date('2026-01-01T00:00:00.000Z'),
        availability: {
          timeZone: 'America/New_York',
          schedule: week('09:00', '13:00'),
          overrides: [],
        },
      }),
    );

    expect(day.date).toBe('2026-01-05');
    expect(day.slots[0]).toBe('2026-01-05T14:00:00.000Z');
    expect(day.slots).toHaveLength(4);
  });

  it('una Franja de la Availability cuenta para el día de la Sucursal en que cae, no para el suyo', () => {
    // 22:00 EST (UTC-5) is 00:00 the next day in Buenos Aires (UTC-3): Sunday's Franja belongs to Monday.
    const [monday, tuesday] = computeSlots(
      base({
        from: '2026-01-05',
        to: '2026-01-06',
        timeZone: 'America/Argentina/Buenos_Aires',
        now: new Date('2026-01-01T00:00:00.000Z'),
        availability: {
          timeZone: 'America/New_York',
          schedule: week('22:00', '23:00'),
          overrides: [],
        },
      }),
    );

    expect(monday.slots).toEqual(['2026-01-05T03:00:00.000Z']);
    expect(tuesday.slots).toEqual(['2026-01-06T03:00:00.000Z']);
  });

  it('una Anulación reemplaza el día en la zona de la Availability', () => {
    const [day] = computeSlots(
      base({
        availability: {
          timeZone: 'Europe/Madrid',
          schedule: week('01:00', '05:00'),
          overrides: [{ date: '2026-03-29', ranges: [] }],
        },
      }),
    );

    expect(day).toEqual({ date: '2026-03-29', slots: [], reason: 'NOT_WORKING' });
  });
});
