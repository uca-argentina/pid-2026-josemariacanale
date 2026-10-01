import type { Booking, CreateBooking } from '@/src/entities/models/booking';
import type { Slots, SlotsQuery } from '@/src/entities/models/slot';

// Reservar from the page of the Enlace de reserva. Public: no Sesión involved.
export interface IBookingsRepository {
    // Throws NotFoundError (404) if the Servicio does not exist, is dado de baja, or the Empleado
    // does not attend it.
    listSlots(query: SlotsQuery): Promise<Slots>;
    // Throws SlotTakenError (409) if the Horario reservable was taken meanwhile, NotFoundError (404)
    // if the Servicio is gone.
    book(input: CreateBooking): Promise<Booking>;
    /**
     * Verifica el email del Cliente con el token del link del mail. El Turno queda aceptado, o pendiente
     * si el Servicio tiene Aprobación manual.
     *
     * @throws {BookingStateError} el token no existe, ya se usó o venció (422)
     * @throws {SlotTakenError} el horario se ocupó mientras tanto (409)
     * @throws {NotFoundError} el Servicio se dio de baja (404)
     */
    verifyBooking(token: string): Promise<Booking>;
}
