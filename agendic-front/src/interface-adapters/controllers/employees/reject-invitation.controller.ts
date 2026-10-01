import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRejectInvitationUseCase } from '@/src/application/use-cases/employees/reject-invitation.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ invitationId: z.number() });

export type IRejectInvitationController = ReturnType<typeof rejectInvitationController>;
/**
 * Rechaza la Invitación del Usuario autenticado.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el id de la Invitación no es válido
 */
export const rejectInvitationController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        rejectInvitationUseCase: IRejectInvitationUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'rejectInvitation Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await rejectInvitationUseCase(data.invitationId);
        });
