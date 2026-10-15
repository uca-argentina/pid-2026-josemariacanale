import {
    createOutOfOfficeAction,
    deleteOutOfOfficeAction,
    previewOutOfOfficeAction,
    updateOutOfOfficeAction,
} from '@/app/(app)/availability/out-of-office/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { LeftOutsideBookingsChangedError, OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';

const mockControllers: Record<string, jest.Mock> = {
    ICreateOutOfOfficeController: jest.fn(),
    IUpdateOutOfOfficeController: jest.fn(),
    IDeleteOutOfOfficeController: jest.fn(),
    IPreviewOutOfOfficeController: jest.fn(),
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
    mockControllers.ICreateOutOfOfficeController.mockResolvedValue({ cancelledBookings: 0 });
});

describe.each([
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

const leftOutside = {
    id: 9,
    startsAt: '2026-10-12T13:00:00.000Z',
    endsAt: '2026-10-12T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: null,
    branch: null,
    cancellationCause: 'OUT_OF_OFFICE' as const,
    cancellationReason: 'Estoy Fuera de la oficina',
};

describe('createOutOfOfficeAction', () => {
    it('sends the confirmed ids with the body, refreshes and answers how many Turnos it cancelled', async () => {
        mockControllers.ICreateOutOfOfficeController.mockResolvedValue({ cancelledBookings: 2 });
        await expect(createOutOfOfficeAction(input, [4, 5])).resolves.toEqual({ ok: true, cancelledBookings: 2 });
        expect(mockControllers.ICreateOutOfOfficeController).toHaveBeenCalledWith({ ...input, cancelBookingIds: [4, 5] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('answers leftOutChanged on the Turnos 409 without refreshing, reporting or showing its message', async () => {
        mockControllers.ICreateOutOfOfficeController.mockRejectedValue(new LeftOutsideBookingsChangedError('cambiaron'));
        await expect(createOutOfOfficeAction(input, [4])).resolves.toEqual({ ok: false, leftOutChanged: true });
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('keeps showing the duplicate 409 and the 422 as before', async () => {
        mockControllers.ICreateOutOfOfficeController.mockRejectedValue(new OutOfOfficeConflictError('Ya hay un período'));
        await expect(createOutOfOfficeAction(input, [])).resolves.toEqual({ ok: false, message: 'Ya hay un período' });
        mockControllers.ICreateOutOfOfficeController.mockRejectedValue(new OutOfOfficeRuleError('fin antes'));
        await expect(createOutOfOfficeAction(input, [])).resolves.toEqual({ ok: false, message: 'fin antes' });
    });

    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers.ICreateOutOfOfficeController.mockRejectedValue(new UnauthenticatedError('no'));
        await expect(createOutOfOfficeAction(input, [])).rejects.toThrow('REDIRECT:');
    });

    it('reports an unexpected error and answers with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.ICreateOutOfOfficeController.mockRejectedValue(error);
        await expect(createOutOfOfficeAction(input, [])).resolves.toMatchObject({ ok: false, message: expect.any(String) });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('previewOutOfOfficeAction', () => {
    it('returns the Turnos that would be left outside without refreshing', async () => {
        mockControllers.IPreviewOutOfOfficeController.mockResolvedValue([leftOutside]);
        await expect(previewOutOfOfficeAction(input)).resolves.toEqual({ ok: true, bookings: [leftOutside] });
        expect(mockControllers.IPreviewOutOfOfficeController).toHaveBeenCalledWith(input);
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it.each([
        [new OutOfOfficeRuleError('fin antes'), 'fin antes'],
        [new OutOfOfficeConflictError('Ya hay un período'), 'Ya hay un período'],
        [new InputParseError('bad'), 'Revisá los datos e intentá de nuevo.'],
    ])('maps %p to its message', async (error, message) => {
        mockControllers.IPreviewOutOfOfficeController.mockRejectedValue(error);
        await expect(previewOutOfOfficeAction(input)).resolves.toEqual({ ok: false, message });
    });

    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers.IPreviewOutOfOfficeController.mockRejectedValue(new UnauthenticatedError('no'));
        await expect(previewOutOfOfficeAction(input)).rejects.toThrow('REDIRECT:');
    });
});
