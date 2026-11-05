import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateStreakRewardUseCase } from '@/src/application/use-cases/streaks/update-streak-reward.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateStreakRewardSchema, type StreakReward } from '@/src/entities/models/streak-program';
import { presentStreakReward } from '@/src/interface-adapters/presenters/streak-program.presenter';

function presenter(reward: StreakReward, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateStreakReward Presenter', op: 'serialize' }, () => presentStreakReward(reward));
}

export type IUpdateStreakRewardController = ReturnType<typeof updateStreakRewardController>;
/**
 * Edita una Recompensa.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada, o el back lo rechazó
 * @throws {UnauthorizedError} es Empleado de ese Negocio, pero no su Dueño
 * @throws {NotFoundError} no existe, está borrada o es de otro
 * @throws {FreeServiceNotAllowedError} el Servicio gratis no es del alcance o está dado de baja
 */
export const updateStreakRewardController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateStreakRewardUseCase: IUpdateStreakRewardUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateStreakReward Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = updateStreakRewardSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateStreakRewardUseCase(data), instrumentationService);
        });
