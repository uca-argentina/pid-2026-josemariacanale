import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Availability, CreateAvailability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICreateAvailabilityUseCase = ReturnType<typeof createAvailabilityUseCase>;

/**
 * Crea una Availability con nombre y Franjas; la primera del Empleado nace predeterminada.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Empleado no existe
 * @throws {AvailabilityRuleError} Franjas solapadas o que no terminan después de empezar
 */
export const createAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (input: CreateAvailability): Promise<Availability> =>
        instrumentationService.startSpan({ name: 'createAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.createAvailability(input),
        );
