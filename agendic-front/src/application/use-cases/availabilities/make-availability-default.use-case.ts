import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Availability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IMakeAvailabilityDefaultUseCase = ReturnType<typeof makeAvailabilityDefaultUseCase>;

/**
 * Marca una Availability como predeterminada; la anterior se desmarca sola.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe
 */
export const makeAvailabilityDefaultUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (availabilityId: number): Promise<Availability> =>
        instrumentationService.startSpan({ name: 'makeAvailabilityDefault Use Case', op: 'function' }, () =>
            availabilitiesRepository.makeDefault(availabilityId),
        );
