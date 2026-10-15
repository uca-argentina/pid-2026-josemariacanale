import { cancelBookingSeriesByLinkAction } from '@/app/turnos/actions';
import { BookingStateError } from '@/src/entities/errors/booking';

const mockController = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'ICancelBookingSeriesByLinkController' ? mockController : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('cancelBookingSeriesByLinkAction', () => {
    it('cancela este y los siguientes, y devuelve el Turno con los que quedaron en pie', async () => {
        const booking = { id: 7, status: 'CANCELLED' };
        const kept = [{ startsAt: '2026-10-24T12:00:00.000Z' }];
        mockController.mockResolvedValue({ booking, kept });

        await expect(cancelBookingSeriesByLinkAction('s3cr3t-l1nk', 'Me mudo')).resolves.toEqual({ ok: true, booking, kept });
        expect(mockController).toHaveBeenCalledWith({ link: 's3cr3t-l1nk', reason: 'Me mudo' });
    });

    it('muestra los 422 con el mensaje de siempre, sin reportarlos', async () => {
        mockController.mockRejectedValue(new BookingStateError('Turno 7 is not part of a Serie'));

        await expect(cancelBookingSeriesByLinkAction('s3cr3t-l1nk')).resolves.toEqual({ ok: false, message: 'El turno ya no se puede cambiar.' });
        expect(mockReport).not.toHaveBeenCalled();
    });
});
