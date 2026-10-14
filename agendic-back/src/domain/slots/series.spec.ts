import { seriesDates } from './series';

describe('seriesDates', () => {
  it('repite la misma fecha local cada N semanas', () => {
    const dates = seriesDates(
      new Date('2026-01-05T12:00:00.000Z'), // Monday 09:00 in Buenos Aires
      2,
      3,
      'America/Argentina/Buenos_Aires',
    );

    expect(dates).toEqual([
      { date: '2026-01-05', startsAt: new Date('2026-01-05T12:00:00.000Z') },
      { date: '2026-01-19', startsAt: new Date('2026-01-19T12:00:00.000Z') },
      { date: '2026-02-02', startsAt: new Date('2026-02-02T12:00:00.000Z') },
    ]);
  });

  it('un cambio de horario de verano no corre la hora local', () => {
    // New York leaves DST on 2026-11-01: 10:00 is 14:00Z before it and 15:00Z after.
    const dates = seriesDates(
      new Date('2026-10-26T14:00:00.000Z'),
      1,
      3,
      'America/New_York',
    );

    expect(dates.map(({ date, startsAt }) => [date, startsAt.toISOString()])).toEqual([
      ['2026-10-26', '2026-10-26T14:00:00.000Z'],
      ['2026-11-02', '2026-11-02T15:00:00.000Z'],
      ['2026-11-09', '2026-11-09T15:00:00.000Z'],
    ]);
  });

  it('toma la fecha local, no la UTC', () => {
    // 23:00 Friday in Buenos Aires is already Saturday in UTC.
    const [first, second] = seriesDates(
      new Date('2026-01-03T02:00:00.000Z'),
      1,
      2,
      'America/Argentina/Buenos_Aires',
    );

    expect(first.date).toBe('2026-01-02');
    expect(second).toEqual({
      date: '2026-01-09',
      startsAt: new Date('2026-01-10T02:00:00.000Z'),
    });
  });
});
