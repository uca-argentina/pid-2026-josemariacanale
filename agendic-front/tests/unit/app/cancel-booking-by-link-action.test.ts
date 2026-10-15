import { cancelBookingByLinkAction } from '@/app/turnos/actions';
import { BookingStateError, CancellationReasonTooLongError } from '@/src/entities/errors/booking';

const mockController = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'ICancelBookingByLinkController' ? mockController : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('cancelBookingByLinkAction', () => {
    it('cancela sin Motivo y devuelve el Turno que responde el back', async () => {
        const booking = { id: 7, status: 'CANCELLED', cancellationReason: null };
        mockController.mockResolvedValue(booking);

        await expect(cancelBookingByLinkAction('s3cr3t-l1nk')).resolves.toEqual({ ok: true, booking });
        expect(mockController).toHaveBeenCalledWith({ link: 's3cr3t-l1nk', reason: undefined });
    });

    it('manda el Motivo de cancelación al back', async () => {
        mockController.mockResolvedValue({ id: 7, status: 'CANCELLED', cancellationReason: 'Me surgió algo' });

        await cancelBookingByLinkAction('s3cr3t-l1nk', 'Me surgió algo');
        expect(mockController).toHaveBeenCalledWith({ link: 's3cr3t-l1nk', reason: 'Me surgió algo' });
    });

    it('muestra el 400 de un Motivo muy largo bajo el campo, sin reportarlo', async () => {
        mockController.mockRejectedValue(new CancellationReasonTooLongError('reason is too long'));

        await expect(cancelBookingByLinkAction('s3cr3t-l1nk', 'x'.repeat(501))).resolves.toEqual({
            ok: false,
            field: 'reason',
            message: 'El motivo puede tener hasta 500 caracteres.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('muestra los 422 con el mensaje de siempre', async () => {
        mockController.mockRejectedValue(new BookingStateError('Turno 7 already started'));
        await expect(cancelBookingByLinkAction('x')).resolves.toEqual({ ok: false, message: 'El turno ya no se puede cambiar.' });
    });
});
