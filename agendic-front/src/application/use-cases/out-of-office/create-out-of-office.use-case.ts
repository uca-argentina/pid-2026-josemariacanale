import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { SaveOutOfOffice } from '@/src/entities/models/out-of-office';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICreateOutOfOfficeUseCase = ReturnType<typeof createOutOfOfficeUseCase>;

/**
 * Crea un período Fuera de la oficina del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 */
export const createOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (input: SaveOutOfOffice): Promise<void> =>
        instrumentationService.startSpan({ name: 'createOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.createOutOfOffice(input),
        );
