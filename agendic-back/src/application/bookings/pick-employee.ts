import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { BusinessRuleError } from '../../domain/errors';
import { addDays } from '../../domain/slots/slot';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';

/**
 * Elige el Empleado que atiende un Turno de `startsAt`: entre los libres en ese horario, el que hace más tiempo que
 * no recibe un Turno del Servicio (sin Turnos previos, gana ese; si empatan, el de menor id). Recalcula los Horarios
 * reservables ahora, así que también comprueba que `startsAt` lo sea. Con `keepEmployeeId`, si ese Empleado está libre
 * se queda con el Turno.
 *
 * @throws {BusinessRuleError} nadie está libre en `startsAt`
 */
export async function pickEmployee(
  listSlots: ListSlotsUseCase,
  bookings: BookingsRepository,
  serviceId: number,
  startsAt: Date,
  { excludeBookingId, keepEmployeeId }: { excludeBookingId?: number; keepEmployeeId?: number } = {},
): Promise<number> {
  // A day of slack either side: the Sucursal's date for `startsAt` is within a day of its UTC date.
  const iso = startsAt.toISOString();
  const utcDate = iso.slice(0, 10);
  const { employees } = await listSlots.executeByEmployee(
    serviceId,
    addDays(utcDate, -1),
    addDays(utcDate, 1),
    excludeBookingId,
  );
  const free = employees
    .filter(({ days }) => days.some((day) => day.slots.includes(iso)))
    .map(({ employeeId }) => employeeId);
  if (free.length === 0)
    throw new BusinessRuleError(
      `Slot ${iso} is not available for Service ${serviceId}`,
    );
  if (keepEmployeeId !== undefined && free.includes(keepEmployeeId))
    return keepEmployeeId;
  const lastReceived = await bookings.lastReceivedByEmployee(
    serviceId,
    free,
    excludeBookingId,
  );
  // Never received sorts first (0); equal times fall back to the lower id.
  return [...free].sort(
    (a, b) =>
      (lastReceived.get(a)?.getTime() ?? 0) -
        (lastReceived.get(b)?.getTime() ?? 0) || a - b,
  )[0];
}
