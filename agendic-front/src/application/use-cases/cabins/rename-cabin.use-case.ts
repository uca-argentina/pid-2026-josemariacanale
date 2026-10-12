import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Cabin, RenameCabin } from '@/src/entities/models/cabin';

export type IRenameCabinUseCase = ReturnType<typeof renameCabinUseCase>;
/**
 * Renombra una Cabina. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {CabinNameTakenError} otra Cabina de la Sucursal ya tiene ese nombre
 * @throws {InvalidCabinNameError} el nombre está vacío o es demasiado largo
 * @throws {NotFoundError} la Cabina no existe o está dada de baja
 */
export const renameCabinUseCase =
    (instrumentationService: IInstrumentationService, cabinsRepository: ICabinsRepository) =>
    (input: RenameCabin): Promise<Cabin> =>
        instrumentationService.startSpan({ name: 'renameCabin Use Case', op: 'function' }, () => cabinsRepository.renameCabin(input));
