import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { OutOfOffice } from '@/src/entities/models/out-of-office';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListOutOfOfficeUseCase = ReturnType<typeof listOutOfOfficeUseCase>;

/**
 * Lista los períodos Fuera de la oficina del Usuario con Sesión que no terminaron.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listOutOfOfficeUseCase =
    (instrumentationService: IInstrumentationService, outOfOfficeRepository: IOutOfOfficeRepository) =>
    (): Promise<OutOfOffice[]> =>
        instrumentationService.startSpan({ name: 'listOutOfOffice Use Case', op: 'function' }, () =>
            outOfOfficeRepository.listOutOfOffice(),
        );
