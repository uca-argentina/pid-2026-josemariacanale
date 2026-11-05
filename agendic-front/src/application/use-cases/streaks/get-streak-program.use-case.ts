import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { StreakProgram, StreakProgramScope } from '@/src/entities/models/streak-program';

export type IGetStreakProgramUseCase = ReturnType<typeof getStreakProgramUseCase>;
/**
 * Lee las Rachas del alcance. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio no existe o está dado de baja
 */
export const getStreakProgramUseCase =
    (instrumentationService: IInstrumentationService, streakProgramsRepository: IStreakProgramsRepository) =>
    (scope: StreakProgramScope): Promise<StreakProgram> =>
        instrumentationService.startSpan({ name: 'getStreakProgram Use Case', op: 'function' }, () => streakProgramsRepository.getProgram(scope));
