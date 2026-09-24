import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const validInput = () => ({
    business: { name: 'Estudio', description: 'Desc', slug: 'estudio' },
    branch: { name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00' },
    service: { name: 'Consulta', category: 'CLINICA', durationMinutes: 30, price: 100 },
});
const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };

describe('createBusinessController', () => {
    it('returns the presented Negocio', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 });
        const controller = createBusinessController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) }),
            useCase,
        );

        await expect(controller(validInput())).resolves.toEqual({ id: 1, name: 'Estudio', slug: 'estudio' });
        expect(useCase).toHaveBeenCalledWith(validInput());
    });

    it('throws InputParseError on an unknown category without calling the use case', async () => {
        const useCase = jest.fn();
        const controller = createBusinessController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) }),
            useCase,
        );
        const input = validInput();

        await expect(controller({ ...input, service: { ...input.service, category: 'X' } })).rejects.toBeInstanceOf(
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
