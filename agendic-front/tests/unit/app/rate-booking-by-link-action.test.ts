import { rateBookingByLinkAction } from '@/app/turnos/actions';
import { BookingAlreadyRatedError, BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';

const mockRate = jest.fn();
const mockGet = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) =>
        key === 'IRateBookingByLinkController' ? mockRate : key === 'IGetBookingByLinkController' ? mockGet : { report: mockReport },
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('rateBookingByLinkAction', () => {
    it('devuelve el Turno calificado', async () => {
        const booking = { id: 7 };
        mockRate.mockResolvedValue(booking);
        await expect(rateBookingByLinkAction('l', 4, 'Bien')).resolves.toEqual({ ok: true, booking });
        expect(mockRate).toHaveBeenCalledWith({ link: 'l', score: 4, comment: 'Bien' });
    });

    it('muestra el 404 como en Cancelar', async () => {
        mockRate.mockRejectedValue(new NotFoundError('Turno not found'));
        await expect(rateBookingByLinkAction('l', 4)).resolves.toEqual({ ok: false, message: 'Este turno ya no existe.' });
    });

    it('muestra el 422 con su mensaje', async () => {
        mockRate.mockRejectedValue(new BookingStateError('Turno cannot be rated'));
        await expect(rateBookingByLinkAction('l', 4)).resolves.toEqual({ ok: false, message: 'Este turno no se puede calificar.' });
    });

    it('en el 409 avisa y recarga el Turno', async () => {
        const reloaded = { id: 7, rating: { score: 5 } };
        mockRate.mockRejectedValue(new BookingAlreadyRatedError('Turno already rated'));
        mockGet.mockResolvedValue(reloaded);
        await expect(rateBookingByLinkAction('l', 4)).resolves.toEqual({
            ok: false,
            message: 'Este Turno ya tiene una Calificación',
            booking: reloaded,
        });
        expect(mockGet).toHaveBeenCalledWith({ link: 'l' });
    });

    it('reporta un error inesperado', async () => {
        mockRate.mockRejectedValue(new Error('boom'));
        await expect(rateBookingByLinkAction('l', 4)).resolves.toEqual({ ok: false, message: 'No pudimos guardar tu calificación. Intentá de nuevo.' });
        expect(mockReport).toHaveBeenCalled();
    });
});
