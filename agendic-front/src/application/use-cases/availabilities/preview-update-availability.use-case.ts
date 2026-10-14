import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { UpdateAvailability } from '@/src/entities/models/availability';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPreviewUpdateAvailabilityUseCase = ReturnType<typeof previewUpdateAvailabilityUseCase>;

/**
 * Los Turnos que guardar esta Availability dejaría afuera. No guarda nada.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida
 */
export const previewUpdateAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (input: UpdateAvailability): Promise<LeftOutsideBooking[]> =>
        instrumentationService.startSpan({ name: 'previewUpdateAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.previewUpdateAvailability(input),
        );
