import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Cabin, CreateCabin } from '@/src/entities/models/cabin';

export type ICreateCabinUseCase = ReturnType<typeof createCabinUseCase>;
/**
 * Agrega una Cabina a la Sucursal. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {CabinNameTakenError} otra Cabina de la Sucursal ya tiene ese nombre
 * @throws {InvalidCabinNameError} el nombre está vacío o es demasiado largo
 */
export const createCabinUseCase =
    (instrumentationService: IInstrumentationService, cabinsRepository: ICabinsRepository) =>
    (input: CreateCabin): Promise<Cabin> =>
        instrumentationService.startSpan({ name: 'createCabin Use Case', op: 'function' }, () => cabinsRepository.createCabin(input));
