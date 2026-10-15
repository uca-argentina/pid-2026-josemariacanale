import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CancelledSeries } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICancelBookingSeriesByLinkUseCase = ReturnType<typeof cancelBookingSeriesByLinkUseCase>;

/**
 * Cancela el Turno de un Enlace del Turno y los siguientes de su Serie (#305); sus horarios quedan libres. Los que el
 * Plazo de cambios no deja Cancelar quedan en pie.
 *
 * Quien tiene el Enlace puede Cancelar ese Turno (ADR 0022): no hay otra autorización que validar.
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no se puede Cancelar, o no es de una Serie
 * @throws {CancellationReasonTooLongError} el Motivo de cancelación es demasiado largo
 */
export const cancelBookingSeriesByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string; reason?: string }): Promise<CancelledSeries> =>
        instrumentationService.startSpan({ name: 'cancelBookingSeriesByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.cancelBookingSeriesByLink(input.link, input.reason),
        );
