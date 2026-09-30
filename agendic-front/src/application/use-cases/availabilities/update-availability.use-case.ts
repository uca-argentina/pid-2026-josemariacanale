import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Availability, UpdateAvailability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IUpdateAvailabilityUseCase = ReturnType<typeof updateAvailabilityUseCase>;

/**
 * Renombra una Availability y/o reemplaza el set entero de Franjas.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe
 * @throws {AvailabilityRuleError} Franjas solapadas o que no terminan después de empezar
 */
export const updateAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (input: UpdateAvailability): Promise<Availability> =>
        instrumentationService.startSpan({ name: 'updateAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.updateAvailability(input),
        );
