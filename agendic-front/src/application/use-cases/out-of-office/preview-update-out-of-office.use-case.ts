import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';
import type { UpdateOutOfOffice } from '@/src/entities/models/out-of-office';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPreviewUpdateOutOfOfficeUseCase = ReturnType<typeof previewUpdateOutOfOfficeUseCase>;

/**
 * Los Turnos que editar este período Fuera de la oficina dejaría afuera. No guarda nada.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el período no existe o no es del Usuario
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 */
export const previewUpdateOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (input: UpdateOutOfOffice): Promise<LeftOutsideBooking[]> =>
        instrumentationService.startSpan({ name: 'previewUpdateOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.previewUpdateOutOfOffice(input),
        );
