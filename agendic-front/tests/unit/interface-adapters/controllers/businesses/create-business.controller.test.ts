import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const validInput = () => ({
    business: { name: 'Estudio', description: 'Desc', slug: 'estudio' },
    branch: { name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires' },
});
const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };

describe('createBusinessController', () => {
    it('returns the presented Negocio', async () => {
        const useCase = jest.fn().mockResolvedValue({
            business: { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: null, ownerId: 7 },
            branch: { id: 3 },
        });
        const controller = createBusinessController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) }),
            useCase,
        );

        await expect(controller(validInput())).resolves.toEqual({ id: 1, name: 'Estudio', slug: 'estudio', branchId: 3 });
        expect(useCase).toHaveBeenCalledWith(validInput());
    });

    it('throws InputParseError on a Sucursal without a zona horaria without calling the use case', async () => {
        const useCase = jest.fn();
        const controller = createBusinessController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) }),
            useCase,
        );
        const input = validInput();

        await expect(controller({ ...input, branch: { name: 'Centro', address: 'Av. 1' } })).rejects.toBeInstanceOf(
            InputParseError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const controller = createBusinessController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) }),
            useCase,
        );

        await expect(controller(validInput())).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
