import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createServiceController } from '@/src/interface-adapters/controllers/services/create-service.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = {
    branchId: 10,
    name: 'Masaje',
    slug: 'masaje',
    description: 'Relajante',
    category: 'SPA',
    durationMinutes: 60,
    price: 20000,
    employeeIds: [1],
};

describe('createServiceController', () => {
    it('creates the Servicio and presents its id, name and tramo', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 100, name: 'Masaje', slug: 'masaje', price: 20000 });

        await expect(createServiceController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({
            id: 100,
            name: 'Masaje',
            slug: 'masaje',
        });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it('lowercases the tramo and accepts a Servicio without description', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 100, name: 'Masaje', slug: 'masaje' });
        const withoutDescription = { ...input, description: undefined };

        await createServiceController(instrumentation, signedIn(), useCase)({ ...withoutDescription, slug: 'Masaje' });
        expect(useCase).toHaveBeenCalledWith({ ...withoutDescription, slug: 'masaje' });
    });

    it.each([
        ['a missing branchId', { ...input, branchId: undefined }],
        ['a blank name', { ...input, name: ' ' }],
        ['a tramo too short', { ...input, slug: 'ma' }],
        ['a malformed tramo', { ...input, slug: 'masaje relajante' }],
        ['a category off the list', { ...input, category: 'PELUQUERIA' }],
        ['a zero duration', { ...input, durationMinutes: 0 }],
        ['a fractional duration', { ...input, durationMinutes: 1.5 }],
        ['a negative price', { ...input, price: -1 }],
        ['no Empleado in charge', { ...input, employeeIds: [] }],
        ['no input', undefined],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(createServiceController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(createServiceController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
