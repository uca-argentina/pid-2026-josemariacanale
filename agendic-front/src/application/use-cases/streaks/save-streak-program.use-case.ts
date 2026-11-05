import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { SaveStreakProgram, StreakProgram } from '@/src/entities/models/streak-program';

export type ISaveStreakProgramUseCase = ReturnType<typeof saveStreakProgramUseCase>;
/**
 * Prende o apaga las Rachas del alcance y fija su Tiempo de quemada. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {InputParseError} el back rechazó el Tiempo de quemada
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio no existe o está dado de baja
 */
export const saveStreakProgramUseCase =
    (instrumentationService: IInstrumentationService, streakProgramsRepository: IStreakProgramsRepository) =>
    (input: SaveStreakProgram): Promise<StreakProgram> =>
        instrumentationService.startSpan({ name: 'saveStreakProgram Use Case', op: 'function' }, () => streakProgramsRepository.saveProgram(input));
