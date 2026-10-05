import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { AvailabilityDetail } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetAvailabilityUseCase = ReturnType<typeof getAvailabilityUseCase>;

/**
 * Trae una Availability del Usuario con sus Franjas y Anulaciones.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 */
export const getAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (availabilityId: number): Promise<AvailabilityDetail> =>
        instrumentationService.startSpan({ name: 'getAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.getAvailability(availabilityId),
        );
