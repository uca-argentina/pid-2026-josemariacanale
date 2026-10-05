import {
  DEFAULT_AVAILABILITY,
  emptySchedule,
  intervalsToSchedule,
  scheduleToIntervals,
} from './availability';

describe('Franjas de una Availability', () => {
  it('agrupa los días con el mismo inicio y fin en una sola Franja', () => {
    const schedule = emptySchedule();
    for (const day of [1, 2, 3, 4, 5]) schedule[day] = [{ start: '09:00', end: '17:00' }];
    schedule[3] = [{ start: '10:00', end: '14:00' }];

    expect(scheduleToIntervals(schedule)).toEqual([
      { days: [1, 2, 4, 5], start: '09:00', end: '17:00' },
      { days: [3], start: '10:00', end: '14:00' },
    ]);
  });

  it('un día sin rangos no genera Franja', () => {
    expect(scheduleToIntervals(emptySchedule())).toEqual([]);
  });

  it('vuelve a la misma matriz, con los rangos de cada día ordenados', () => {
    const schedule = emptySchedule();
    schedule[1] = [
      { start: '09:00', end: '13:00' },
      { start: '14:30', end: '18:00' },
    ];
    schedule[6] = [{ start: '09:00', end: '13:00' }];

    expect(intervalsToSchedule(scheduleToIntervals(schedule))).toEqual(schedule);
  });

  it('la predeterminada es de lunes a viernes de 9 a 17', () => {
    expect(scheduleToIntervals(DEFAULT_AVAILABILITY.schedule)).toEqual([
      { days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' },
    ]);
  });
});
