import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Availability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListAvailabilitiesUseCase = ReturnType<typeof listAvailabilitiesUseCase>;

/**
 * Lista las Availability de un Empleado.
 *
 * Que sea el Dueño del Negocio o el propio Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Empleado no existe
 */
export const listAvailabilitiesUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (employeeId: number): Promise<Availability[]> =>
        instrumentationService.startSpan({ name: 'listAvailabilities Use Case', op: 'function' }, () =>
            availabilitiesRepository.listAvailabilities(employeeId),
        );
