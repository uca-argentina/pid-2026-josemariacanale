import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetBookingByLinkUseCase = ReturnType<typeof getBookingByLinkUseCase>;

/**
 * Abre el Turno de un Enlace del Turno, en cualquier estado, sin Código de verificación (ADR 0022).
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 */
export const getBookingByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'getBookingByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.getBookingByLink(input.link),
        );
