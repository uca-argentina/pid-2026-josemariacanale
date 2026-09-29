import { getSlotsAction } from '@/app/businessPage/actions';
import { getInjection } from '@/di/container';
import { NotFoundError, ValidationError, ApiRequestError, InputParseError } from '@/src/entities/errors/common';

jest.mock('@/di/container', () => ({
    getInjection: jest.fn(),
}));

describe('getSlotsAction', () => {
    const validParams = {
        serviceId: 1,
        employeeId: 2,
        from: '2026-10-05',
        to: '2026-10-07',
    };

    it('returns timeZone and days on success', async () => {
        const mockController = jest.fn().mockResolvedValue({
            timeZone: 'America/Argentina/Buenos_Aires',
            days: [
                { date: '2026-10-05', slots: ['2026-10-05T12:00:00.000Z'] },
            ],
        });
        (getInjection as jest.Mock).mockReturnValue(mockController);

        const result = await getSlotsAction(validParams);

        expect(getInjection).toHaveBeenCalledWith('IGetSlotsController');
        expect(mockController).toHaveBeenCalledWith(validParams);
        expect(result).toEqual({
            timeZone: 'America/Argentina/Buenos_Aires',
            days: [
                { date: '2026-10-05', slots: ['2026-10-05T12:00:00.000Z'] },
            ],
        });
    });

    it('returns error message on NotFoundError', async () => {
        const mockController = jest.fn().mockRejectedValue(new NotFoundError('Servicio no encontrado'));
        (getInjection as jest.Mock).mockReturnValue(mockController);

        const result = await getSlotsAction(validParams);

        expect(result).toEqual({ error: 'Servicio no encontrado' });
    });

    it('returns error message on ValidationError', async () => {
        const mockController = jest.fn().mockRejectedValue(new ValidationError('Rango mayor a 31 días'));
        (getInjection as jest.Mock).mockReturnValue(mockController);

        const result = await getSlotsAction(validParams);

        expect(result).toEqual({ error: 'Rango mayor a 31 días' });
    });

    it('returns error message on InputParseError', async () => {
        const mockController = jest.fn().mockRejectedValue(new InputParseError('Invalid data'));
        (getInjection as jest.Mock).mockReturnValue(mockController);

        const result = await getSlotsAction(validParams);

        expect(result).toEqual({ error: 'Parámetros de búsqueda inválidos' });
    });

    it('returns error message on ApiRequestError', async () => {
        const mockController = jest.fn().mockRejectedValue(new ApiRequestError('GET /services/1/slots failed'));
        (getInjection as jest.Mock).mockReturnValue(mockController);

        const result = await getSlotsAction(validParams);

        expect(result).toEqual({ error: 'GET /services/1/slots failed' });
    });

    it('returns generic error on unknown exception', async () => {
        const mockController = jest.fn().mockRejectedValue(new Error('Unknown crash'));
        (getInjection as jest.Mock).mockReturnValue(mockController);

        const result = await getSlotsAction(validParams);

        expect(result).toEqual({ error: 'Ocurrió un error inesperado al consultar los horarios' });
    });
});
