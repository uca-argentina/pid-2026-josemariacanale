import { markEmployeeNoShowByLinkAction } from '@/app/turnos/actions';
import { BookingStateError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

const mockController = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IMarkEmployeeNoShowByLinkController' ? mockController : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('markEmployeeNoShowByLinkAction', () => {
    it('devuelve el Turno que responde el back', async () => {
        const booking = { id: 7 };
        mockController.mockResolvedValue(booking);

        await expect(markEmployeeNoShowByLinkAction('s3cr3t-l1nk')).resolves.toEqual({ ok: true, booking });
        expect(mockController).toHaveBeenCalledWith({ link: 's3cr3t-l1nk' });
    });

    it('muestra el 404 como en Cancelar', async () => {
        mockController.mockRejectedValue(new NotFoundError('Turno not found'));
        await expect(markEmployeeNoShowByLinkAction('x')).resolves.toEqual({ ok: false, message: 'Este turno ya no existe.' });
    });

    it('muestra cada 422 con su mensaje', async () => {
        mockController.mockRejectedValue(new BookingStateError('Employee no-show window closed'));
        await expect(markEmployeeNoShowByLinkAction('x')).resolves.toEqual({ ok: false, message: 'Ya pasó el plazo para marcar la falta.' });
    });

    it('un 422 desconocido cae al mensaje genérico', async () => {
        mockController.mockRejectedValue(new BookingStateError('algo nuevo'));
        await expect(markEmployeeNoShowByLinkAction('x')).resolves.toEqual({ ok: false, message: 'El turno ya no se puede cambiar.' });
    });

    it('un Enlace vacío pide revisar los datos', async () => {
        mockController.mockRejectedValue(new InputParseError('Invalid data'));
        await expect(markEmployeeNoShowByLinkAction('')).resolves.toEqual({ ok: false, message: 'Revisá los datos e intentá de nuevo.' });
    });

    it('reporta un error inesperado y da el mensaje genérico', async () => {
        mockController.mockRejectedValue(new Error('boom'));
        await expect(markEmployeeNoShowByLinkAction('x')).resolves.toEqual({ ok: false, message: 'No pudimos marcar la falta. Intentá de nuevo.' });
        expect(mockReport).toHaveBeenCalled();
    });
});
