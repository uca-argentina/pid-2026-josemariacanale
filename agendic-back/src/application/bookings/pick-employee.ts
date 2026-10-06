import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { BusinessRuleError } from '../../domain/errors';
import { addDays } from '../../domain/slots/slot';
import { EmployeeSlots, ListSlotsUseCase } from '../slots/list-slots.use-case';

const attendant = ({ employeeId, userId }: EmployeeSlots) => ({
  employeeId,
  userId,
});

/**
 * Elige quién atiende un Turno de `startsAt`: en un Servicio personal, su Usuario; en uno del Negocio, entre los
 * Empleados libres en ese horario, el que hace más tiempo que no recibe un Turno del Servicio (sin Turnos previos, gana ese; si empatan, el de menor id). Recalcula los Horarios
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
): Promise<{ employeeId: number | null; userId: number }> {
  // A day of slack either side: the Sucursal's date for `startsAt` is within a day of its UTC date.
  const iso = startsAt.toISOString();
  const utcDate = iso.slice(0, 10);
  const { employees } = await listSlots.executeByEmployee(
    serviceId,
    addDays(utcDate, -1),
    addDays(utcDate, 1),
    excludeBookingId,
  );
  const free = employees.filter(({ days }) =>
    days.some((day) => day.slots.includes(iso)),
  );
  if (free.length === 0)
    throw new BusinessRuleError(
      `Slot ${iso} is not available for Service ${serviceId}`,
    );
  // A Servicio personal has a single attendant: nothing to choose.
  if (free[0].employeeId === null) return attendant(free[0]);
  const freeIds = free.map(({ employeeId }) => employeeId!);
  const kept = free.find(({ employeeId }) => employeeId === keepEmployeeId);
  if (kept) return attendant(kept);
  const lastReceived = await bookings.lastReceivedByEmployee(
    serviceId,
    freeIds,
    excludeBookingId,
  );
  // Never received sorts first (0); equal times fall back to the lower id.
  return attendant(
    [...free].sort(
      (a, b) =>
        (lastReceived.get(a.employeeId!)?.getTime() ?? 0) -
          (lastReceived.get(b.employeeId!)?.getTime() ?? 0) ||
        a.employeeId! - b.employeeId!,
    )[0],
  );
}
