import { Availability } from '../availabilities/availability';
import { dayRangesReader, localDate } from './slot';

/** The Availability as the horario reads it: its Franjas and Anulaciones, in its own zone. */
export type ScheduleAvailability = Pick<
  Availability,
  'id' | 'timeZone' | 'schedule' | 'overrides'
>;

/** Un período de días enteros que bloquea al Usuario: Fuera de la oficina, o un Día festivo prendido como período de un día. Fechas inclusivas. */
export interface BlockedPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/** El horario de un Usuario en un momento: lo que se compara antes y después de un cambio. */
export interface UserSchedule {
  availabilities: ScheduleAvailability[];
  blocked: BlockedPeriod[];
}

/** El tramo de un Turno que tiene que caber en el horario: de su preparación a su fin. */
export interface BookingTramo {
  availabilityId: number;
  prepStartsAt: Date;
  endsAt: Date;
}

/** Un Turno que queda afuera, con la fecha local en la que cae (en la zona de su Availability). */
export interface LeftOutside<B> {
  booking: B;
  date: string;
}

/** Sorted, disjoint intervals: periods that overlap are joined, so one binary search answers any date. */
const mergeBlocked = (periods: BlockedPeriod[]): BlockedPeriod[] => {
  const merged: BlockedPeriod[] = [];
  for (const { startDate, endDate } of [...periods].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  )) {
    const last = merged.at(-1);
    // YYYY-MM-DD compares in date order as text.
    if (last && startDate <= last.endDate) {
      if (endDate > last.endDate) last.endDate = endDate;
    } else merged.push({ startDate, endDate });
  }
  return merged;
};

const isBlocked = (merged: BlockedPeriod[], date: string): boolean => {
  let low = 0;
  let high = merged.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (date < merged[mid].startDate) high = mid - 1;
    else if (date > merged[mid].endDate) low = mid + 1;
    else return true;
  }
  return false;
};

/** Reads a horario once (Anulaciones by date, blocked periods merged) to answer for each Turno. */
const reader = ({ availabilities, blocked }: UserSchedule) => {
  const merged = mergeBlocked(blocked);
  const byId = new Map(
    availabilities.map((a) => [
      a.id,
      { timeZone: a.timeZone, rangesOn: dayRangesReader(a) },
    ]),
  );
  return ({ availabilityId, prepStartsAt, endsAt }: BookingTramo) => {
    const availability = byId.get(availabilityId);
    if (!availability) return null;
    const date = localDate(prepStartsAt, availability.timeZone);
    const inside =
      !isBlocked(merged, date) &&
      availability
        .rangesOn(date)
        .some(
          (r) =>
            r.start <= prepStartsAt.getTime() && endsAt.getTime() <= r.end,
        );
    return { date, inside };
  };
};

/**
 * Los Turnos que estaban dentro del horario `before` y quedan afuera en `after` (ADR 0034). Los que ya estaban
 * afuera no se devuelven, en el orden recibido.
 *
 * "Dentro" es la regla de los Horarios reservables: el tramo de la preparación al fin cabe en una sola Franja de la
 * fecha local (o de su Anulación, que la reemplaza), leída en la zona de su Availability, y esa fecha no cae en un
 * período bloqueado. Una Availability desconocida deja el Turno afuera. Pura: sin I/O.
 */
export function bookingsLeftOutside<B extends BookingTramo>(
  bookings: B[],
  before: UserSchedule,
  after: UserSchedule,
): LeftOutside<B>[] {
  const readBefore = reader(before);
  const readAfter = reader(after);
  const left: LeftOutside<B>[] = [];
  for (const booking of bookings) {
    const was = readBefore(booking);
    if (!was?.inside) continue;
    const now = readAfter(booking);
    if (!now?.inside) left.push({ booking, date: (now ?? was).date });
  }
  return left;
}
