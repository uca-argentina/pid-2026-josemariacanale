import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { retireServiceController } from '@/src/interface-adapters/controllers/services/retire-service.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });

describe('retireServiceController', () => {
    it('retires the Servicio and presents how many Turnos got cancelled', async () => {
        const useCase = jest.fn().mockResolvedValue({ cancelledBookings: 3 });

        await expect(retireServiceController(instrumentation, signedIn(), useCase)({ id: 100 })).resolves.toEqual({
            cancelledBookings: 3,
        });
        expect(useCase).toHaveBeenCalledWith({ id: 100 });
    });

    it.each([
        ['a missing id', {}],
        ['an id that is not a number', { id: '100' }],
        ['a fractional id', { id: 1.5 }],
        ['no input', undefined],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(retireServiceController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(retireServiceController(instrumentation, auth, useCase)({ id: 100 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
