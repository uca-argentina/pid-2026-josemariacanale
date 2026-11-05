import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetStreakProgramUseCase } from '@/src/application/use-cases/streaks/get-streak-program.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { streakProgramScopeSchema, type StreakProgram } from '@/src/entities/models/streak-program';
import { presentStreakProgram } from '@/src/interface-adapters/presenters/streak-program.presenter';

function presenter(program: StreakProgram, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getStreakProgram Presenter', op: 'serialize' }, () => presentStreakProgram(program));
}

export type IGetStreakProgramController = ReturnType<typeof getStreakProgramController>;
/**
 * Las Rachas que muestra la pantalla: las del Negocio con `businessId` o, sin él, las de los Servicios personales.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio no existe o está dado de baja
 */
export const getStreakProgramController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getStreakProgramUseCase: IGetStreakProgramUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getStreakProgram Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = streakProgramScopeSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await getStreakProgramUseCase(data), instrumentationService);
        });
