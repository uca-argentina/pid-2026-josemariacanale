import {
    acceptBookingAction,
    cancelBookingAction,
    markBookingNoShowAction,
    rejectBookingAction,
    rescheduleBookingAction,
} from '@/app/(app)/bookings/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { BookingNotAllowedError, BookingStateError, SlotTakenError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    IAcceptBookingController: jest.fn(),
    IRejectBookingController: jest.fn(),
    ICancelBookingController: jest.fn(),
    IRescheduleBookingController: jest.fn(),
    IMarkBookingNoShowController: jest.fn(),
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
    ['acceptBookingAction', 'IAcceptBookingController', () => acceptBookingAction(7)],
    ['rejectBookingAction', 'IRejectBookingController', () => rejectBookingAction(7)],
    ['cancelBookingAction', 'ICancelBookingController', () => cancelBookingAction(7)],
    ['markBookingNoShowAction', 'IMarkBookingNoShowController', () => markBookingNoShowAction(7)],
    ['rescheduleBookingAction', 'IRescheduleBookingController', () => rescheduleBookingAction(7, '2026-10-02T15:00:00.000Z')],
])('%s', (_name, controller, run) => {
    it('calls its controller and refreshes the page', async () => {
        await expect(run()).resolves.toEqual({ ok: true });
        expect(mockControllers[controller]).toHaveBeenCalledWith(
            expect.objectContaining({ bookingId: 7 }),
        );
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers[controller].mockRejectedValue(new UnauthenticatedError('no'));
        await expect(run()).rejects.toThrow('REDIRECT:');
    });

    it.each([
        [new BookingNotAllowedError('403'), 'Este turno no es tuyo.', false],
        [new NotFoundError('404'), 'Este turno ya no existe.', true],
        [new BookingStateError('422'), 'El turno cambió mientras tanto. Actualizamos la lista.', true],
        [new InputParseError('bad'), 'Revisá los datos e intentá de nuevo.', false],
    ])('maps %p to its message without reporting it', async (error, message, refreshes) => {
        mockControllers[controller].mockRejectedValue(error);
        await expect(run()).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
    });

    it('reports an unexpected error and returns a generic message', async () => {
        const boom = new Error('boom');
        mockControllers[controller].mockRejectedValue(boom);
        const result = await run();
        expect(result.ok).toBe(false);
        expect(mockReport).toHaveBeenCalledWith(boom);
    });
});

describe('rescheduleBookingAction', () => {
    it('sends the chosen startsAt', async () => {
        await rescheduleBookingAction(7, '2026-10-02T15:00:00.000Z');
        expect(mockControllers.IRescheduleBookingController).toHaveBeenCalledWith({ bookingId: 7, startsAt: '2026-10-02T15:00:00.000Z' });
    });

    it('shows a 409 as "elegí otro horario" without reporting it', async () => {
        mockControllers.IRescheduleBookingController.mockRejectedValue(new SlotTakenError('taken'));
        const result = await rescheduleBookingAction(7, '2026-10-02T15:00:00.000Z');
        expect(result).toMatchObject({ ok: false, slotTaken: true, message: expect.stringContaining('Elegí otro horario') });
        expect(mockReport).not.toHaveBeenCalled();
    });
});
