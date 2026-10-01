import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListMyInvitationsUseCase } from '@/src/application/use-cases/employees/list-my-invitations.use-case';
import type { MyInvitation } from '@/src/entities/models/employee';

function presenter(invitations: MyInvitation[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyInvitations Presenter', op: 'serialize' }, () =>
        invitations.map((i) => ({ id: i.id, business: { name: i.business.name, slug: i.business.slug } })),
    );
}

export type IListMyInvitationsController = ReturnType<typeof listMyInvitationsController>;
/**
 * Lista las Invitaciones pendientes del Usuario autenticado.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 */
export const listMyInvitationsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyInvitationsUseCase: IListMyInvitationsUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyInvitations Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listMyInvitationsUseCase(), instrumentationService);
        });
