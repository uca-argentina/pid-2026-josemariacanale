import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createPersonalServiceController } from '@/src/interface-adapters/controllers/services/create-personal-service.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'a@x.com' }) });
const input = {
    name: 'Clase',
    slug: 'clase',
    category: 'ACADEMIA',
    durationMinutes: 45,
    price: 5000,
    availabilityId: 7,
};

describe('createPersonalServiceController', () => {
    it('creates the Servicio personal with its Availability and presents what the panel confirms', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...input, id: 200, description: null, hidden: false });

        await expect(createPersonalServiceController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({
            id: 200,
            name: 'Clase',
            slug: 'clase',
        });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['without an Availability', { ...input, availabilityId: undefined }],
        ['with a Sucursal', { ...input, availabilityId: undefined, branchId: 10 }],
        ['with an invalid tramo', { ...input, slug: 'a b' }],
    ])('throws InputParseError %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(createPersonalServiceController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(createPersonalServiceController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
