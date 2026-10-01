import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { RetiredService } from '@/src/entities/models/service';

export type IRetireServiceUseCase = ReturnType<typeof retireServiceUseCase>;
/**
 * Dar de baja: retires a Servicio and cancels its future Turnos. "Only the Dueño" is enforced by the back (403).
 *
 * @throws {NotFoundError} the Servicio does not exist or was already retired
 * @throws {ApiRequestError} not the Dueño, or the back failed
 */
export const retireServiceUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: { id: number }): Promise<RetiredService> =>
        instrumentationService.startSpan({ name: 'retireService Use Case', op: 'function' }, () =>
            servicesRepository.retireService(input.id),
        );
