import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteStreakRewardUseCase } from '@/src/application/use-cases/streaks/delete-streak-reward.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ id: z.number().int().positive() });

export type IDeleteStreakRewardController = ReturnType<typeof deleteStreakRewardController>;
/**
 * Borra una Recompensa.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 * @throws {UnauthorizedError} es Empleado de ese Negocio, pero no su Dueño
 * @throws {NotFoundError} no existe, ya está borrada o es de otro
 */
export const deleteStreakRewardController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteStreakRewardUseCase: IDeleteStreakRewardUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteStreakReward Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteStreakRewardUseCase(data.id);
        });
