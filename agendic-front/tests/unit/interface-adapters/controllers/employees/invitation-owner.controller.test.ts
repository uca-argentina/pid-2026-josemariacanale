import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { cancelInvitationController } from '@/src/interface-adapters/controllers/employees/cancel-invitation.controller';
import { resendInvitationController } from '@/src/interface-adapters/controllers/employees/resend-invitation.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'ana@estudio.com' }) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

describe.each([
    ['resendInvitationController', resendInvitationController],
    ['cancelInvitationController', cancelInvitationController],
])('%s', (_name, controller) => {
    it('passes the invitationId to the use case', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await controller(instrumentation, signedIn(), useCase)({ invitationId: 4 });
        expect(useCase).toHaveBeenCalledWith(4);
    });

    it.each([['a non-numeric id', { invitationId: '4' }], ['no input', undefined]])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without Sesión', async () => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedOut(), useCase)({ invitationId: 4 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
