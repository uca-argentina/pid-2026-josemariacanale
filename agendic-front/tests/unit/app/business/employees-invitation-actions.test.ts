import { addEmployeeAction, cancelInvitationAction, resendInvitationAction } from '@/app/(app)/business/[businessId]/employees/actions';
import { ApiRequestError, InputParseError } from '@/src/entities/errors/common';
import { AlreadyEmployeeError, BranchesRequiredError, BranchNotOfBusinessError, InvitationNotPendingError } from '@/src/entities/errors/employee';

const mockControllers: Record<string, jest.Mock> = {
    IResendInvitationController: jest.fn(),
    ICancelInvitationController: jest.fn(),
    IAddEmployeeController: jest.fn(),
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

describe('addEmployeeAction', () => {
    it('sends the Invitación with its Sucursales and refreshes the table', async () => {
        await expect(addEmployeeAction({ businessId: 1, email: 'm@x.com', branchIds: [2] })).resolves.toEqual({ ok: true });
        expect(mockControllers.IAddEmployeeController).toHaveBeenCalledWith({ businessId: 1, email: 'm@x.com', branchIds: [2] });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it.each([
        ['400 without Sucursales', new BranchesRequiredError('branchIds must have at least one Branch'), 'Elegí al menos una Sucursal.'],
        [
            '422 of a Sucursal of another Negocio',
            new BranchNotOfBusinessError('Branch 9 is not a Branch of Business 1'),
            'Una de las Sucursales ya no es de tu Negocio. Recargá la página y elegí de nuevo.',
        ],
    ])('shows the %s under the Sucursales', async (_case, error, message) => {
        mockControllers.IAddEmployeeController.mockRejectedValue(error);

        await expect(addEmployeeAction({ businessId: 1, email: 'm@x.com' })).resolves.toEqual({ ok: false, field: 'branchIds', message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('shows an Empleado that already is one under the email', async () => {
        mockControllers.IAddEmployeeController.mockRejectedValue(new AlreadyEmployeeError('Already an Employee'));

        await expect(addEmployeeAction({ businessId: 1, email: 'm@x.com' })).resolves.toMatchObject({ ok: false, field: 'email' });
    });
});
