import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Availability } from '@/src/entities/models/availability';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListAvailabilitiesUseCase = ReturnType<typeof listAvailabilitiesUseCase>;

/**
 * Lista las Availability del Usuario con Sesión, sin Franjas.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listAvailabilitiesUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (): Promise<Availability[]> =>
        instrumentationService.startSpan({ name: 'listAvailabilities Use Case', op: 'function' }, () =>
            availabilitiesRepository.listAvailabilities(),
        );
