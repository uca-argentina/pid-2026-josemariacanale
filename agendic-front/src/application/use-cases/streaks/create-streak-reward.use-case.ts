import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CreateStreakReward, StreakReward } from '@/src/entities/models/streak-program';

export type ICreateStreakRewardUseCase = ReturnType<typeof createStreakRewardUseCase>;
/**
 * Crea una Recompensa en el alcance. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {InputParseError} el back rechazó los campos
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio no existe o está dado de baja
 * @throws {FreeServiceNotAllowedError} el Servicio gratis no es del alcance o está dado de baja
 */
export const createStreakRewardUseCase =
    (instrumentationService: IInstrumentationService, streakProgramsRepository: IStreakProgramsRepository) =>
    (input: CreateStreakReward): Promise<StreakReward> =>
        instrumentationService.startSpan({ name: 'createStreakReward Use Case', op: 'function' }, () => streakProgramsRepository.createReward(input));
