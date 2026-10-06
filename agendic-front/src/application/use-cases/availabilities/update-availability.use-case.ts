import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { UpdateAvailability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IUpdateAvailabilityUseCase = ReturnType<typeof updateAvailabilityUseCase>;

/**
 * Reemplaza nombre, zona horaria, Franjas y Anulaciones de una Availability.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida
 */
export const updateAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (input: UpdateAvailability): Promise<void> =>
        instrumentationService.startSpan({ name: 'updateAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.updateAvailability(input),
        );
