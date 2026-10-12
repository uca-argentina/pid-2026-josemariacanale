import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { BusinessRuleError } from '../../domain/errors';
import { Service } from '../../domain/services/service';

/**
 * Elige la Cabina de un Turno que ocupa `[prepStartsAt, endsAt)` (ADR 0030): entre las que admite el Servicio y están
 * libres en ese tramo, la que hace más tiempo que no recibe un Turno de cualquier Servicio (sin Turnos previos, gana
 * esa; si empatan, la de menor id). Un Servicio sin Cabinas no ocupa ninguna: devuelve `null`.
 *
 * @throws {BusinessRuleError} no queda ninguna Cabina libre en ese tramo
 */
export async function pickCabin(
  bookings: BookingsRepository,
  service: Pick<Service, 'id' | 'cabins'>,
  startsAt: Date,
  prepStartsAt: Date,
  endsAt: Date,
): Promise<number | null> {
  if (service.cabins.length === 0) return null;
  const cabinIds = service.cabins.map(({ id }) => id);
  const taken = new Set(
    (await bookings.listOccupiedByCabins(cabinIds, prepStartsAt, endsAt)).map(
      ({ cabinId }) => cabinId,
    ),
  );
  const free = cabinIds.filter((id) => !taken.has(id));
  if (free.length === 0)
    throw new BusinessRuleError(
      `Slot ${startsAt.toISOString()} is not available for Service ${service.id}`,
    );
  const lastReceived = await bookings.lastReceivedByCabin(free);
  // Never received sorts first (0); equal times fall back to the lower id.
  return free.sort(
    (a, b) =>
      (lastReceived.get(a)?.getTime() ?? 0) -
        (lastReceived.get(b)?.getTime() ?? 0) || a - b,
  )[0];
}
