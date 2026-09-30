import {
    createAvailabilityAction,
    deleteAvailabilityAction,
    makeAvailabilityDefaultAction,
    saveAvailabilityAction,
} from '@/app/(app)/availability/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AvailabilityInUseError, AvailabilityRuleError } from '@/src/entities/errors/availability';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    ICreateAvailabilityController: jest.fn(),
    IUpdateAvailabilityController: jest.fn(),
    IMakeAvailabilityDefaultController: jest.fn(),
    IDeleteAvailabilityController: jest.fn(),
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

const intervals = [{ weekday: 1, startTime: '09:00', endTime: '13:00' }];

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue(undefined));
});

describe.each([
    ['createAvailabilityAction', 'ICreateAvailabilityController', () => createAvailabilityAction(3, 'Verano', intervals)],
    [
        'saveAvailabilityAction',
        'IUpdateAvailabilityController',
        () => saveAvailabilityAction({ availabilityId: 7, name: 'Verano', intervals, makeDefault: false }),
    ],
    ['makeAvailabilityDefaultAction', 'IMakeAvailabilityDefaultController', () => makeAvailabilityDefaultAction(7)],
    ['deleteAvailabilityAction', 'IDeleteAvailabilityController', () => deleteAvailabilityAction(7)],
])('%s', (_name, controller, run) => {
    it('calls its controller and refreshes the page', async () => {
        await expect(run()).resolves.toEqual({ ok: true });
        expect(mockControllers[controller]).toHaveBeenCalledTimes(1);
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers[controller].mockRejectedValue(new UnauthenticatedError('no'));
        await expect(run()).rejects.toThrow('REDIRECT:');
    });

    it('sends the Usuario to sign-in on a 401 from the API', async () => {
        mockControllers[controller].mockRejectedValue(new ApiRequestError('no', { status: 401 }));
        await expect(run()).rejects.toThrow('REDIRECT:');
    });

    it.each([
        [new AvailabilityRuleError('Dos Franjas del mismo día se solapan'), 'Dos Franjas del mismo día se solapan', false],
        [
            new AvailabilityInUseError('No se puede borrar la Availability: la usan 2 Servicios'),
            'No se puede borrar la Availability: la usan 2 Servicios',
            false,
        ],
        [new NotFoundError('404'), 'Estas horas laborables ya no existen. Actualizamos la lista.', true],
        [new InputParseError('bad'), 'Revisá los datos e intentá de nuevo.', false],
    ])('maps %p to its message without reporting it', async (error, message, refreshes) => {
        mockControllers[controller].mockRejectedValue(error);
        await expect(run()).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
    });

    it('reports an unexpected error and answers with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers[controller].mockRejectedValue(error);
        const result = await run();
        expect(result).toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('saveAvailabilityAction', () => {
    it('sends name and Franjas to the update, not the makeDefault flag', async () => {
        await saveAvailabilityAction({ availabilityId: 7, name: 'Verano', intervals, makeDefault: false });
        expect(mockControllers.IUpdateAvailabilityController).toHaveBeenCalledWith({ availabilityId: 7, name: 'Verano', intervals });
        expect(mockControllers.IMakeAvailabilityDefaultController).not.toHaveBeenCalled();
    });

    it('marks it default after updating when asked', async () => {
        await expect(saveAvailabilityAction({ availabilityId: 7, name: 'Verano', intervals, makeDefault: true })).resolves.toEqual({
            ok: true,
        });
        expect(mockControllers.IMakeAvailabilityDefaultController).toHaveBeenCalledWith({ availabilityId: 7 });
    });

    it('does not mark it default when the update failed', async () => {
        mockControllers.IUpdateAvailabilityController.mockRejectedValue(new AvailabilityRuleError('solapadas'));
        await expect(saveAvailabilityAction({ availabilityId: 7, name: 'Verano', intervals, makeDefault: true })).resolves.toEqual({
            ok: false,
            message: 'solapadas',
        });
        expect(mockControllers.IMakeAvailabilityDefaultController).not.toHaveBeenCalled();
    });
});
