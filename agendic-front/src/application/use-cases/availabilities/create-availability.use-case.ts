import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CreateAvailability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICreateAvailabilityUseCase = ReturnType<typeof createAvailabilityUseCase>;

/**
 * Crea una Availability del Usuario con nombre y zona horaria.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {AvailabilityRuleError} zona horaria inválida
 */
export const createAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (input: CreateAvailability): Promise<void> =>
        instrumentationService.startSpan({ name: 'createAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.createAvailability(input),
        );
