import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';


export type IRetireCabinUseCase = ReturnType<typeof retireCabinUseCase>;
/**
 * Da de baja una Cabina. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {NotFoundError} la Cabina no existe o ya está dada de baja
 * @throws {ApiRequestError} el back la rechazó, por ejemplo porque tiene Turnos futuros (409)
 */
export const retireCabinUseCase =
    (instrumentationService: IInstrumentationService, cabinsRepository: ICabinsRepository) =>
    (input: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'retireCabin Use Case', op: 'function' }, () => cabinsRepository.retireCabin(input));
