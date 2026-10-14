import {
    createAvailabilityAction,
    deleteAvailabilityAction,
    makeAvailabilityDefaultAction,
    previewAvailabilityAction,
    saveAvailabilityAction,
} from '@/app/(app)/availability/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AvailabilityRuleError } from '@/src/entities/errors/availability';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';

const mockControllers: Record<string, jest.Mock> = {
    ICreateAvailabilityController: jest.fn(),
    IPreviewUpdateAvailabilityController: jest.fn(),
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

const content = {
    timeZone: 'America/Argentina/Buenos_Aires',
    schedule: [[], [{ start: '09:00', end: '13:00' }], [], [], [], [], []],
    overrides: [{ date: '2026-12-25', ranges: [] }],
};

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue(undefined));
    mockControllers.IUpdateAvailabilityController.mockResolvedValue({ cancelledBookings: 0 });
});

describe.each([
    ['createAvailabilityAction', 'ICreateAvailabilityController', () => createAvailabilityAction('Verano', 'UTC')],
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
            new AvailabilityRuleError('No se puede borrar la Availability: un Servicio se atiende con ella'),
            'No se puede borrar la Availability: un Servicio se atiende con ella',
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
    it('sends the whole content to the update, not the makeDefault flag', async () => {
        await saveAvailabilityAction({ availabilityId: 7, name: 'Verano', ...content, makeDefault: false });
        expect(mockControllers.IUpdateAvailabilityController).toHaveBeenCalledWith({
            availabilityId: 7,
            name: 'Verano',
            ...content,
            cancelBookingIds: undefined,
        });
        expect(mockControllers.IMakeAvailabilityDefaultController).not.toHaveBeenCalled();
    });

    it('marks it default after updating when asked', async () => {
        await expect(saveAvailabilityAction({ availabilityId: 7, name: 'Verano', ...content, makeDefault: true })).resolves.toEqual({
            ok: true,
            cancelledBookings: 0,
        });
        expect(mockControllers.IMakeAvailabilityDefaultController).toHaveBeenCalledWith({ availabilityId: 7 });
    });

    it('does not mark it default when the update failed', async () => {
        mockControllers.IUpdateAvailabilityController.mockRejectedValue(new AvailabilityRuleError('solapadas'));
        await expect(saveAvailabilityAction({ availabilityId: 7, name: 'Verano', ...content, makeDefault: true })).resolves.toEqual({
            ok: false,
            message: 'solapadas',
        });
        expect(mockControllers.IMakeAvailabilityDefaultController).not.toHaveBeenCalled();
    });

    it('says the rest was saved when only marking it default failed', async () => {
        mockControllers.IMakeAvailabilityDefaultController.mockRejectedValue(new Error('boom'));
        await expect(saveAvailabilityAction({ availabilityId: 7, name: 'Verano', ...content, makeDefault: true })).resolves.toEqual({
            ok: false,
            message: 'Guardamos los cambios, pero no pudimos marcarlas como predeterminadas. Intentá de nuevo.',
        });
        expect(mockControllers.IUpdateAvailabilityController).toHaveBeenCalled();
    });
});

const inputs = { availabilityId: 7, name: 'Verano', ...content };
const booking = { id: 9, serviceName: 'Corte' };

describe.each([
    ['previewAvailabilityAction', 'IPreviewUpdateAvailabilityController', () => previewAvailabilityAction(inputs)],
    ['saveAvailabilityAction', 'IUpdateAvailabilityController', () => saveAvailabilityAction({ ...inputs, makeDefault: false })],
])('%s errors', (_name, controller, run) => {
    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers[controller].mockRejectedValue(new UnauthenticatedError('no'));
        await expect(run()).rejects.toThrow('REDIRECT:');
    });

    it.each([
        [new AvailabilityRuleError('Dos Franjas del mismo día se solapan'), 'Dos Franjas del mismo día se solapan', false],
        [new NotFoundError('404'), 'Estas horas laborables ya no existen. Actualizamos la lista.', true],
        [new InputParseError('bad'), 'Revisá los datos e intentá de nuevo.', false],
    ])('maps %p to its message without opening the dialog', async (error, message, refreshes) => {
        mockControllers[controller].mockRejectedValue(error);
        await expect(run()).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
    });

    it('reports an unexpected error and answers with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers[controller].mockRejectedValue(error);
        await expect(run()).resolves.toMatchObject({ ok: false, message: expect.any(String) });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('previewAvailabilityAction', () => {
    it('sends the whole content and answers the Turnos without refreshing the page', async () => {
        mockControllers.IPreviewUpdateAvailabilityController.mockResolvedValue([booking]);
        await expect(previewAvailabilityAction(inputs)).resolves.toEqual({ ok: true, bookings: [booking] });
        expect(mockControllers.IPreviewUpdateAvailabilityController).toHaveBeenCalledWith(inputs);
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});

describe('saveAvailabilityAction with Turnos that quedan afuera', () => {
    it('sends the confirmed Turno ids, refreshes the page and answers how many were cancelled', async () => {
        mockControllers.IUpdateAvailabilityController.mockResolvedValue({ cancelledBookings: 2 });
        await expect(saveAvailabilityAction({ ...inputs, makeDefault: false }, [9, 11])).resolves.toEqual({
            ok: true,
            cancelledBookings: 2,
        });
        expect(mockControllers.IUpdateAvailabilityController).toHaveBeenCalledWith({ ...inputs, cancelBookingIds: [9, 11] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('answers leftOutChanged on the 409 of Turnos without refreshing or marking it default', async () => {
        mockControllers.IUpdateAvailabilityController.mockRejectedValue(new LeftOutsideBookingsChangedError('cambiaron'));
        await expect(saveAvailabilityAction({ ...inputs, makeDefault: true }, [9])).resolves.toEqual({ ok: false, leftOutChanged: true });
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(mockReport).not.toHaveBeenCalled();
        expect(mockControllers.IMakeAvailabilityDefaultController).not.toHaveBeenCalled();
    });
});
