import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IDeleteStreakRewardUseCase = ReturnType<typeof deleteStreakRewardUseCase>;
/**
 * Borra una Recompensa; los Premios ya ganados siguen en pie. "Solo el dueño del programa" lo valida el back; acá no se revalida.
 *
 * @throws {UnauthorizedError} es Empleado de ese Negocio, pero no su Dueño
 * @throws {NotFoundError} no existe, ya está borrada o es de otro
 */
export const deleteStreakRewardUseCase =
    (instrumentationService: IInstrumentationService, streakProgramsRepository: IStreakProgramsRepository) =>
    (id: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteStreakReward Use Case', op: 'function' }, () => streakProgramsRepository.deleteReward(id));
