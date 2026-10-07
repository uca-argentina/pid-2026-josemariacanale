import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRescheduleBookingByLinkUseCase = ReturnType<typeof rescheduleBookingByLinkUseCase>;

/**
 * Reagenda el Turno pendiente o aceptado de un Enlace del Turno a otro Horario reservable del mismo Servicio;
 * el horario anterior queda libre. Si el Servicio tiene Aprobación manual, el Turno vuelve a quedar pendiente.
 *
 * Quien tiene el Enlace puede Reagendar ese Turno (ADR 0022); que el horario exista lo valida el back.
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {SlotTakenError} el horario choca con otro Turno del Empleado
 * @throws {SlotUnavailableError} el horario ya no es un Horario reservable
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado
 */
export const rescheduleBookingByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string; startsAt: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'rescheduleBookingByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.rescheduleBookingByLink(input.link, input.startsAt),
        );
