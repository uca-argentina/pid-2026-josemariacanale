import { downloadBookingsCsvAction } from '@/app/(app)/analytics/actions';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

const mockController = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IDownloadBookingsCsvController' ? mockController : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn(), redirect: jest.fn() }));

const query = { from: '2026-09-13', to: '2026-10-12' };

beforeEach(() => jest.clearAllMocks());

describe('downloadBookingsCsvAction', () => {
    it('passes the file and the name', async () => {
        const file = { filename: 'turnos-2026-09-13-2026-10-12.csv', content: 'a\n' };
        mockController.mockResolvedValue(file);

        await expect(downloadBookingsCsvAction(query)).resolves.toEqual({ ok: true, file });
        expect(mockController).toHaveBeenCalledWith(query);
    });

    it.each([
        [new UnauthorizedError('no'), 'Solo los Empleados de este Negocio pueden descargar sus Turnos.'],
        [new NotFoundError('no'), 'No encontramos el Negocio o algo de lo que filtraste.'],
        [new InputParseError('no'), 'El rango no es válido.'],
    ])('translates %s', async (error, message) => {
        mockController.mockRejectedValue(error);
        await expect(downloadBookingsCsvAction(query)).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('reports an unexpected error and gives the generic message', async () => {
        mockController.mockRejectedValue(new Error('boom'));
        await expect(downloadBookingsCsvAction(query)).resolves.toEqual({ ok: false, message: 'No pudimos descargar los Turnos. Intentá de nuevo.' });
        expect(mockReport).toHaveBeenCalled();
    });
});
