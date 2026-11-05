import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateStreakRewardUseCase } from '@/src/application/use-cases/streaks/create-streak-reward.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createStreakRewardSchema, type StreakReward } from '@/src/entities/models/streak-program';
import { presentStreakReward } from '@/src/interface-adapters/presenters/streak-program.presenter';

function presenter(reward: StreakReward, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createStreakReward Presenter', op: 'serialize' }, () => presentStreakReward(reward));
}

export type ICreateStreakRewardController = ReturnType<typeof createStreakRewardController>;
/**
 * Crea una Recompensa en el alcance.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada, o el back lo rechazó
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio no existe o está dado de baja
 * @throws {FreeServiceNotAllowedError} el Servicio gratis no es del alcance o está dado de baja
 */
export const createStreakRewardController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createStreakRewardUseCase: ICreateStreakRewardUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createStreakReward Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = createStreakRewardSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createStreakRewardUseCase(data), instrumentationService);
        });
