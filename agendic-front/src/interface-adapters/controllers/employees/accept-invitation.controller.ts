import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAcceptInvitationUseCase } from '@/src/application/use-cases/employees/accept-invitation.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ invitationId: z.number() });

export type IAcceptInvitationController = ReturnType<typeof acceptInvitationController>;
/**
 * Acepta la Invitación del Usuario autenticado.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el id de la Invitación no es válido
 */
export const acceptInvitationController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        acceptInvitationUseCase: IAcceptInvitationUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'acceptInvitation Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await acceptInvitationUseCase(data.invitationId);
        });
