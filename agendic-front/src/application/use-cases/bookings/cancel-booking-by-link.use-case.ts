import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICancelBookingByLinkUseCase = ReturnType<typeof cancelBookingByLinkUseCase>;

/**
 * Cancela el Turno pendiente o aceptado de un Enlace del Turno; su horario queda libre.
 *
 * Quien tiene el Enlace puede Cancelar ese Turno (ADR 0022): no hay otra autorización que validar.
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó
 */
export const cancelBookingByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'cancelBookingByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.cancelBookingByLink(input.link),
        );
