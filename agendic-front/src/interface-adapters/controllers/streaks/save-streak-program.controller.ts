import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISaveStreakProgramUseCase } from '@/src/application/use-cases/streaks/save-streak-program.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { saveStreakProgramSchema, type StreakProgram } from '@/src/entities/models/streak-program';
import { presentStreakProgram } from '@/src/interface-adapters/presenters/streak-program.presenter';

function presenter(program: StreakProgram, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'saveStreakProgram Presenter', op: 'serialize' }, () => presentStreakProgram(program));
}

export type ISaveStreakProgramController = ReturnType<typeof saveStreakProgramController>;
/**
 * Guarda el interruptor y el Tiempo de quemada de las Rachas del alcance.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada, o el back lo rechazó
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio no existe o está dado de baja
 */
export const saveStreakProgramController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        saveStreakProgramUseCase: ISaveStreakProgramUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'saveStreakProgram Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = saveStreakProgramSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await saveStreakProgramUseCase(data), instrumentationService);
        });
