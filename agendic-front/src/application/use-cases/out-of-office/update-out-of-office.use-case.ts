import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { UpdateOutOfOffice } from '@/src/entities/models/out-of-office';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IUpdateOutOfOfficeUseCase = ReturnType<typeof updateOutOfOfficeUseCase>;

/**
 * Cambia un período Fuera de la oficina del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el período no existe o no es del Usuario
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 */
export const updateOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (input: UpdateOutOfOffice): Promise<void> =>
        instrumentationService.startSpan({ name: 'updateOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.updateOutOfOffice(input),
        );
