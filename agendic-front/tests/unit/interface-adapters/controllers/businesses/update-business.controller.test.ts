import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { updateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio' };

describe('updateBusinessController', () => {
    it('returns the presented Negocio, without ownerId', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...input, ownerId: 7 });

        await expect(updateBusinessController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual(input);
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['a missing id', { ...input, id: undefined }],
        ['a non-string name', { ...input, name: 3 }],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(updateBusinessController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(updateBusinessController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
