import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CancelledBookings } from '@/src/entities/models/left-outside-booking';
import type { ConfirmedOutOfOffice } from '@/src/entities/models/out-of-office';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICreateOutOfOfficeUseCase = ReturnType<typeof createOutOfOfficeUseCase>;

/**
 * Crea un período Fuera de la oficina del Usuario con Sesión y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const createOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (input: ConfirmedOutOfOffice): Promise<CancelledBookings> =>
        instrumentationService.startSpan({ name: 'createOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.createOutOfOffice(input),
        );
