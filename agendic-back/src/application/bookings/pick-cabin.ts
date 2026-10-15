import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { BusinessRuleError } from '../../domain/errors';
import { Service } from '../../domain/services/service';

/**
 * Las Cabinas que admite el Servicio y están libres en `[prepStartsAt, endsAt)`, en el orden de la regla de la ADR 0030:
 * la que hace más tiempo que no recibe un Turno de cualquier Servicio primero (sin Turnos previos, gana esa; si
 * empatan, la de menor id). `excludeBookingId` deja libre el tramo del propio Turno al Reagendar.
 */
export async function freeCabinsInOrder(
  bookings: BookingsRepository,
  service: Pick<Service, 'cabins'>,
  prepStartsAt: Date,
  endsAt: Date,
  excludeBookingId?: number,
): Promise<number[]> {
  const cabinIds = service.cabins.map(({ id }) => id);
  if (cabinIds.length === 0) return [];
  const taken = new Set(
    (
      await bookings.listOccupiedByCabins(cabinIds, prepStartsAt, endsAt, excludeBookingId)
    ).map(({ cabinId }) => cabinId),
  );
  const free = cabinIds.filter((id) => !taken.has(id));
  if (free.length === 0) return [];
  const lastReceived = await bookings.lastReceivedByCabin(free, excludeBookingId);
  // Never received sorts first (0); equal times fall back to the lower id.
  return free.sort(
    (a, b) =>
      (lastReceived.get(a)?.getTime() ?? 0) -
        (lastReceived.get(b)?.getTime() ?? 0) || a - b,
  );
}

/**
 * Elige la Cabina de un Turno que ocupa `[prepStartsAt, endsAt)` (ADR 0030): entre las que admite el Servicio y están
 * libres en ese tramo, la que hace más tiempo que no recibe un Turno de cualquier Servicio (sin Turnos previos, gana
 * esa; si empatan, la de menor id). Un Servicio sin Cabinas no ocupa ninguna: devuelve `null`. Al Reagendar,
 * `excludeBookingId` deja libre el tramo del propio Turno y, si `keepCabinId` sigue admitida y libre, se queda con ella.
 *
 * @throws {BusinessRuleError} no queda ninguna Cabina libre en ese tramo
 */
export async function pickCabin(
  bookings: BookingsRepository,
  service: Pick<Service, 'id' | 'cabins'>,
  startsAt: Date,
  prepStartsAt: Date,
  endsAt: Date,
  {
    excludeBookingId,
    keepCabinId,
  }: { excludeBookingId?: number; keepCabinId?: number } = {},
): Promise<number | null> {
  if (service.cabins.length === 0) return null;
  const free = await freeCabinsInOrder(
    bookings,
    service,
    prepStartsAt,
    endsAt,
    excludeBookingId,
  );
  if (free.length === 0)
    throw new BusinessRuleError(
      `Slot ${startsAt.toISOString()} is not available for Service ${service.id}`,
    );
  if (keepCabinId !== undefined && free.includes(keepCabinId))
    return keepCabinId;
  return free[0];
}
