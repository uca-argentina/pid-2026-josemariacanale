import type { Booking, CreateBooking } from '@/src/entities/models/booking';
import type { Slots, SlotsQuery } from '@/src/entities/models/slot';

// Reservar from the page of the Enlace de reserva. Public: no Sesión involved.
export interface IBookingsRepository {
    // Throws NotFoundError (404) if the Servicio does not exist, is dado de baja, or the Empleado
    // does not attend it.
    listSlots(query: SlotsQuery): Promise<Slots>;
    // Throws SlotTakenError (409) if the Horario reservable was taken meanwhile, NotFoundError (404)
    // if the Servicio is gone.
    createBooking(input: CreateBooking): Promise<Booking>;
}
