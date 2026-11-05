import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { StreakReward, UpdateStreakReward } from '@/src/entities/models/streak-program';

export type IUpdateStreakRewardUseCase = ReturnType<typeof updateStreakRewardUseCase>;
/**
 * Edita una Recompensa; no cambia los Premios ya ganados. "Solo el dueño del programa" lo valida el back; acá no se revalida.
 *
 * @throws {InputParseError} el back rechazó los campos
 * @throws {UnauthorizedError} es Empleado de ese Negocio, pero no su Dueño
 * @throws {NotFoundError} no existe, está borrada o es de otro
 * @throws {FreeServiceNotAllowedError} el Servicio gratis no es del alcance o está dado de baja
 */
export const updateStreakRewardUseCase =
    (instrumentationService: IInstrumentationService, streakProgramsRepository: IStreakProgramsRepository) =>
    (input: UpdateStreakReward): Promise<StreakReward> =>
        instrumentationService.startSpan({ name: 'updateStreakReward Use Case', op: 'function' }, () => streakProgramsRepository.updateReward(input));
