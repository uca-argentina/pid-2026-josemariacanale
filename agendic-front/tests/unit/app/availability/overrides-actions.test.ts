import { removeOverrideAction, setOverridesAction } from '@/app/(app)/availability/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { OverrideConflictError, OverrideRuleError } from '@/src/entities/errors/override';

const mockControllers: Record<string, jest.Mock> = {
    ISetOverridesController: jest.fn(),
    IRemoveOverrideController: jest.fn(),
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

const set = { employeeId: 3, dates: ['2026-12-24'], intervals: [], coveredByEmployeeId: 4 };

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue(undefined));
});

describe.each([
    ['setOverridesAction', 'ISetOverridesController', () => setOverridesAction(set)],
    ['removeOverrideAction', 'IRemoveOverrideController', () => removeOverrideAction(3, '2026-12-24')],
])('%s', (_name, controller, run) => {
    it('calls its controller and refreshes the page', async () => {
        await expect(run()).resolves.toEqual({ ok: true });
        expect(mockControllers[controller]).toHaveBeenCalledTimes(1);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers[controller].mockRejectedValue(new UnauthenticatedError('no'));
        await expect(run()).rejects.toThrow('REDIRECT:');
    });

    it('answers a missing Empleado and refreshes', async () => {
        mockControllers[controller].mockRejectedValue(new NotFoundError('404'));
        await expect(run()).resolves.toEqual({ ok: false, message: 'Este Empleado ya no existe. Actualizamos la página.' });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('maps InputParseError without reporting it', async () => {
        mockControllers[controller].mockRejectedValue(new InputParseError('bad'));
        await expect(run()).resolves.toEqual({ ok: false, message: 'Revisá los datos e intentá de nuevo.' });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('reports an unexpected error and answers with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers[controller].mockRejectedValue(error);
        await expect(run()).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('setOverridesAction', () => {
    it('passes the input to the controller untouched', async () => {
        await setOverridesAction(set);
        expect(mockControllers.ISetOverridesController).toHaveBeenCalledWith(set);
    });

    it.each([
        new OverrideRuleError('El compañero no atiende los mismos Servicios'),
        new OverrideConflictError('Martina ya tiene un Turno a esa hora'),
    ])('shows the message of the back as is for %p', async (error) => {
        mockControllers.ISetOverridesController.mockRejectedValue(error);
        await expect(setOverridesAction(set)).resolves.toEqual({ ok: false, message: error.message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('refreshes after a failure on several dates, since the earlier ones were saved', async () => {
        mockControllers.ISetOverridesController.mockRejectedValue(new OverrideConflictError('choca'));
        await setOverridesAction({ ...set, dates: ['2026-12-24', '2026-12-25'] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
});