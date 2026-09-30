import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IDeleteAvailabilityUseCase = ReturnType<typeof deleteAvailabilityUseCase>;

/**
 * Borra una Availability con sus Franjas.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe
 * @throws {AvailabilityRuleError} es la predeterminada
 * @throws {AvailabilityInUseError} algún Servicio la usa
 */
export const deleteAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (availabilityId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.deleteAvailability(availabilityId),
        );
