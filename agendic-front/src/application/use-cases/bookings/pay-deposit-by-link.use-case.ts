import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPayDepositByLinkUseCase = ReturnType<typeof payDepositByLinkUseCase>;

/**
 * Paga la Seña del Turno de un Enlace del Turno. Es simulado: Agendic no cobra.
 *
 * Quien tiene el Enlace puede pagar la Seña de ese Turno (ADR 0022, 0027): no hay otra autorización que validar.
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado, ya empezó, no tiene Seña o ya la tiene pagada
 */
export const payDepositByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'payDepositByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.payDepositByLink(input.link),
        );
