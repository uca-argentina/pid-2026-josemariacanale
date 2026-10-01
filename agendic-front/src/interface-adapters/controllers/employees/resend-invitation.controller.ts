import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IResendInvitationUseCase } from '@/src/application/use-cases/employees/resend-invitation.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Invitation } from '@/src/entities/models/employee';

const inputSchema = z.object({ invitationId: z.number() });

export type IResendInvitationController = ReturnType<typeof resendInvitationController>;
/**
 * Reenvía una Invitación pendiente del Negocio del Dueño autenticado.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el id de la Invitación no es válido
 */
export const resendInvitationController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        resendInvitationUseCase: IResendInvitationUseCase,
    ) =>
    async (input: unknown): Promise<Invitation> =>
        instrumentationService.startSpan({ name: 'resendInvitation Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return resendInvitationUseCase(data.invitationId);
        });
