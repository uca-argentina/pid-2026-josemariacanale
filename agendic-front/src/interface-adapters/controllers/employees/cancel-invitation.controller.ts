import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICancelInvitationUseCase } from '@/src/application/use-cases/employees/cancel-invitation.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ invitationId: z.number() });

export type ICancelInvitationController = ReturnType<typeof cancelInvitationController>;
/**
 * Cancela una Invitación pendiente del Negocio del Dueño autenticado.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el id de la Invitación no es válido
 */
export const cancelInvitationController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        cancelInvitationUseCase: ICancelInvitationUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'cancelInvitation Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await cancelInvitationUseCase(data.invitationId);
        });
