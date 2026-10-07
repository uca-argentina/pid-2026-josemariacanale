import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientAccess } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IOpenClientAccessUseCase = ReturnType<typeof openClientAccessUseCase>;

/**
 * Cambia un Código de verificación vigente por un acceso de 15 minutos a Mis turnos (ADR 0022).
 *
 * @throws {InvalidVerificationCodeError} el código no es válido para email, o venció
 */
export const openClientAccessUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { email: string; code: string }): Promise<ClientAccess> =>
        instrumentationService.startSpan({ name: 'openClientAccess Use Case', op: 'function' }, () =>
            clientBookingsRepository.openAccess(input.email, input.code),
        );
