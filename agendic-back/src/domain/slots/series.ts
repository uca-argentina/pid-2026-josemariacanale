import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { addDays } from './slot';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Una fecha de una Serie: el día local en `timeZone` y el instante en que arranca el Turno. */
export interface SeriesDate {
  date: string; // YYYY-MM-DD
  startsAt: Date;
}

/**
 * Las fechas de una Serie: `count` Turnos que arrancan a la misma hora local, cada `everyWeeks` semanas desde `first`.
 * La hora se fija en la zona, no en UTC, así que un cambio de horario de verano no la corre.
 */
export function seriesDates(
  first: Date,
  everyWeeks: number,
  count: number,
  timeZone: string,
): SeriesDate[] {
  const local = dayjs(first).tz(timeZone);
  const firstDate = local.format('YYYY-MM-DD');
  const time = local.format('HH:mm');
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(firstDate, i * everyWeeks * 7);
    return { date, startsAt: new Date(dayjs.tz(`${date} ${time}`, timeZone).valueOf()) };
  });
}
