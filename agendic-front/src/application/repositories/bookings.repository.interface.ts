import type { Booking, CreateBooking } from '@/src/entities/models/booking';
import type { Slots, SlotsQuery } from '@/src/entities/models/slot';

/** Reservar desde la página del Enlace de reserva. Es público: no hay Sesión. */
export interface IBookingsRepository {
    /**
     * @throws {NotFoundError} el Servicio no existe, está dado de baja o el Empleado no lo atiende (404)
     */
    listSlots(query: SlotsQuery): Promise<Slots>;
    /**
     * Pide un Código de verificación para email (ADR 0022).
     *
     * @throws {TooManyVerificationCodeRequestsError} ya se pidieron demasiados para ese email (429)
     */
    requestVerificationCode(email: string): Promise<void>;
    /**
     * @throws {InvalidVerificationCodeError} el código no es válido para clientEmail, o venció (400)
     * @throws {SlotTakenError} el Horario reservable se ocupó mientras tanto (409)
     * @throws {NotFoundError} el Servicio ya no existe (404)
     */
    book(input: CreateBooking): Promise<Booking>;
}
