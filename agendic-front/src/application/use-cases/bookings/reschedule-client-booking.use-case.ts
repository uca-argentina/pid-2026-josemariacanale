import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRescheduleClientBookingUseCase = ReturnType<typeof rescheduleClientBookingUseCase>;

/**
 * Reagenda un Turno pendiente o aceptado del Cliente a otro Horario reservable del mismo Servicio; el
 * horario anterior queda libre. Si el Servicio tiene Aprobación manual, el Turno vuelve a quedar pendiente.
 *
 * Que el Turno sea del email del acceso y que el horario exista lo valida el back.
 *
 * @throws {ClientAccessExpiredError} el acceso falta o venció
 * @throws {NotFoundError} el Turno no existe
 * @throws {SlotTakenError} el horario choca con otro Turno del Empleado
 * @throws {SlotUnavailableError} el horario ya no es un Horario reservable
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado
 */
export const rescheduleClientBookingUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { access: string; bookingId: number; startsAt: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'rescheduleClientBooking Use Case', op: 'function' }, () =>
            clientBookingsRepository.reschedule(input.access, input.bookingId, input.startsAt),
        );
