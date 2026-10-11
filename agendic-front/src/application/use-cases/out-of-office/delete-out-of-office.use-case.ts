import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IDeleteOutOfOfficeUseCase = ReturnType<typeof deleteOutOfOfficeUseCase>;

/**
 * Borra un período Fuera de la oficina del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el período no existe o no es del Usuario
 */
export const deleteOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (outOfOfficeId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.deleteOutOfOffice(outOfOfficeId),
        );
