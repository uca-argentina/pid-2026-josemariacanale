import {
    createOutOfOfficeAction,
    deleteOutOfOfficeAction,
    updateOutOfOfficeAction,
} from '@/app/(app)/availability/out-of-office/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';

const mockControllers: Record<string, jest.Mock> = {
    ICreateOutOfOfficeController: jest.fn(),
    IUpdateOutOfOfficeController: jest.fn(),
    IDeleteOutOfOfficeController: jest.fn(),
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

const input = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'VACATION' as const, notes: 'Playa', showNotePublicly: true };

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue(undefined));
});

describe.each([
    ['createOutOfOfficeAction', 'ICreateOutOfOfficeController', () => createOutOfOfficeAction(input)],
    ['updateOutOfOfficeAction', 'IUpdateOutOfOfficeController', () => updateOutOfOfficeAction(7, input)],
    ['deleteOutOfOfficeAction', 'IDeleteOutOfOfficeController', () => deleteOutOfOfficeAction(7)],
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
        [new OutOfOfficeRuleError('La fecha de fin no puede ser anterior a la de inicio'), 'La fecha de fin no puede ser anterior a la de inicio', false],
        [new OutOfOfficeConflictError('Ya hay un período Fuera de la oficina con esas fechas'), 'Ya hay un período Fuera de la oficina con esas fechas', false],
        [new NotFoundError('404'), 'Este período ya no existe. Actualizamos la lista.', true],
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
        await expect(run()).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('updateOutOfOfficeAction', () => {
    it('sends the id together with the body', async () => {
        await updateOutOfOfficeAction(7, input);
        expect(mockControllers.IUpdateOutOfOfficeController).toHaveBeenCalledWith({ outOfOfficeId: 7, ...input });
    });
});
