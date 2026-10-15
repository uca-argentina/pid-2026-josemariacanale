import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ConfirmedUpdateAvailability } from '@/src/entities/models/availability';
import type { CancelledBookings } from '@/src/entities/models/left-outside-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IUpdateAvailabilityUseCase = ReturnType<typeof updateAvailabilityUseCase>;

/**
 * Reemplaza nombre, zona horaria, Franjas y Anulaciones de una Availability y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const updateAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilitiesRepository: IAvailabilitiesRepository) =>
    (input: ConfirmedUpdateAvailability): Promise<CancelledBookings> =>
        instrumentationService.startSpan({ name: 'updateAvailability Use Case', op: 'function' }, () =>
            availabilitiesRepository.updateAvailability(input),
        );
