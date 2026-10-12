import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Cabin } from '@/src/entities/models/cabin';

export type IListCabinsUseCase = ReturnType<typeof listCabinsUseCase>;
/**
 * Lista las Cabinas activas de la Sucursal. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {NotFoundError} la Sucursal no existe
 */
export const listCabinsUseCase =
    (instrumentationService: IInstrumentationService, cabinsRepository: ICabinsRepository) =>
    (input: number): Promise<Cabin[]> =>
        instrumentationService.startSpan({ name: 'listCabins Use Case', op: 'function' }, () => cabinsRepository.listCabins(input));
