import { cancelInvitationAction, resendInvitationAction } from '@/app/(app)/business/employees/actions';
import { ApiRequestError, InputParseError } from '@/src/entities/errors/common';
import { InvitationNotPendingError } from '@/src/entities/errors/employee';

const mockControllers: Record<string, jest.Mock> = {
    IResendInvitationController: jest.fn(),
    ICancelInvitationController: jest.fn(),
};
const mockReport = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => mockControllers[key] ?? { report: mockReport },
}));
jest.mock('next/cache', () => ({ refresh: () => mockRefresh() }));
jest.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`REDIRECT:${path}`);
    },
    unstable_rethrow: (error: Error) => {
        if (/^REDIRECT/.test(error.message)) throw error;
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue(undefined));
});

describe.each([
    ['resendInvitationAction', 'IResendInvitationController', resendInvitationAction],
    ['cancelInvitationAction', 'ICancelInvitationController', cancelInvitationAction],
])('%s', (_name, controller, action) => {
    it('calls its controller and refreshes the table', async () => {
        await expect(action({ invitationId: 4 })).resolves.toEqual({ ok: true });
        expect(mockControllers[controller]).toHaveBeenCalledWith({ invitationId: 4 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it.each([
        ['422 (ya respondida)', new InvitationNotPendingError('x')],
        ['404', new ApiRequestError('no', { status: 404 })],
    ])('on %s refreshes and says the Invitación is no longer pending', async (_case, error) => {
        mockControllers[controller].mockRejectedValue(error);

        await expect(action({ invitationId: 4 })).resolves.toEqual({ ok: false, message: 'La Invitación ya no está pendiente.' });
        expect(mockRefresh).toHaveBeenCalled();
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('reports unexpected errors without refreshing', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers[controller].mockRejectedValue(error);

        const result = await action({ invitationId: 4 });
        expect(result.ok).toBe(false);
        expect(mockReport).toHaveBeenCalledWith(error);
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('asks to review the data on InputParseError', async () => {
        mockControllers[controller].mockRejectedValue(new InputParseError('bad'));

        await expect(action({})).resolves.toEqual({ ok: false, message: 'Revisá los datos e intentá de nuevo.' });
    });
});
