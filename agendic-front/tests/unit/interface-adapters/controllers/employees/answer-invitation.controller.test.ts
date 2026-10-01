import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { acceptInvitationController } from '@/src/interface-adapters/controllers/employees/accept-invitation.controller';
import { listMyInvitationsController } from '@/src/interface-adapters/controllers/employees/list-my-invitations.controller';
import { rejectInvitationController } from '@/src/interface-adapters/controllers/employees/reject-invitation.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'ana@x.com' }) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

describe('listMyInvitationsController', () => {
    it('presents the Invitaciones with their Negocio', async () => {
        const useCase = jest.fn().mockResolvedValue([{ id: 1, business: { name: 'Estudio', slug: 'estudio', extra: 1 } }]);

        await expect(listMyInvitationsController(instrumentation, signedIn(), useCase)()).resolves.toEqual([
            { id: 1, business: { name: 'Estudio', slug: 'estudio' } },
        ]);
    });

    it('throws UnauthenticatedError without Sesión', async () => {
        const useCase = jest.fn();

        await expect(listMyInvitationsController(instrumentation, signedOut(), useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe.each([
    ['acceptInvitationController', acceptInvitationController],
    ['rejectInvitationController', rejectInvitationController],
])('%s', (_name, controller) => {
    it('passes the invitationId to the use case', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await controller(instrumentation, signedIn(), useCase)({ invitationId: 3 });
        expect(useCase).toHaveBeenCalledWith(3);
    });

    it.each([[{ invitationId: 'x' }], [undefined]])('throws InputParseError for %j', async (bad) => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without Sesión', async () => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedOut(), useCase)({ invitationId: 3 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
