import type { Booking, CreateBooking } from '@/src/entities/models/booking';
import type { Slots, SlotsQuery } from '@/src/entities/models/slot';

/** Reservar desde la página del Enlace de reserva. Es público: no hay Sesión. */
export interface IBookingsRepository {
    /**
     * @throws {NotFoundError} el Servicio no existe, está dado de baja o el Empleado no lo atiende (404)
     */
    listSlots(query: SlotsQuery): Promise<Slots>;
    /**
     * @throws {SlotTakenError} el Horario reservable se ocupó mientras tanto (409)
     * @throws {NotFoundError} el Servicio ya no existe (404)
     */
    book(input: CreateBooking): Promise<Booking>;
    /**
     * Verifica el email del Cliente con el token del link del mail. El Turno queda aceptado, o pendiente
     * si el Servicio tiene Aprobación manual.
     *
     * @throws {BookingStateError} el token no existe, ya se usó o venció, o el Turno ya no se puede reservar (422)
     * @throws {SlotTakenError} el horario se ocupó mientras tanto (409)
     * @throws {NotFoundError} el Turno ya no existe (404)
     */
    verifyBooking(token: string): Promise<Booking>;
}
