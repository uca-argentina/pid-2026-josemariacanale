import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRateBookingByLinkUseCase = ReturnType<typeof rateBookingByLinkUseCase>;

/**
 * Califica el Turno de un Enlace del Turno de 1 a 5, con un comentario opcional.
 *
 * Quien tiene el Enlace puede calificar (ADR 0022): no hay otra autorización que validar.
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no se puede calificar
 * @throws {BookingAlreadyRatedError} el Turno ya tiene su Calificación
 */
export const rateBookingByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string; score: number; comment?: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'rateBookingByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.rateBookingByLink(input.link, { score: input.score, comment: input.comment }),
        );
