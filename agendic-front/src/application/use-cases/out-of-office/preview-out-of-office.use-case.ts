import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';
import type { SaveOutOfOffice } from '@/src/entities/models/out-of-office';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPreviewOutOfOfficeUseCase = ReturnType<typeof previewOutOfOfficeUseCase>;

/**
 * Los Turnos que crear este período Fuera de la oficina dejaría afuera. No guarda nada.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 */
export const previewOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (input: SaveOutOfOffice): Promise<LeftOutsideBooking[]> =>
        instrumentationService.startSpan({ name: 'previewOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.previewOutOfOffice(input),
        );
