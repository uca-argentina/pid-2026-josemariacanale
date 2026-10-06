import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { updateMySlugController } from '@/src/interface-adapters/controllers/users/update-my-slug.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'a@x.com' }) });

describe('updateMySlugController', () => {
    it('changes the Enlace de reserva, lowercased, and presents only it', async () => {
        const useCase = jest.fn().mockResolvedValue({ name: 'Ana', slug: 'ana-lopez' });

        await expect(updateMySlugController(instrumentation, signedIn(), useCase)({ slug: 'Ana-Lopez' })).resolves.toEqual({
            slug: 'ana-lopez',
        });
        expect(useCase).toHaveBeenCalledWith({ slug: 'ana-lopez' });
    });

    it.each([
        ['too short', { slug: 'an' }],
        ['with spaces', { slug: 'ana lopez' }],
        ['missing', {}],
    ])('throws InputParseError for a slug %s, without calling the use case', async (_case, input) => {
        const useCase = jest.fn();

        await expect(updateMySlugController(instrumentation, signedIn(), useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(updateMySlugController(instrumentation, auth, useCase)({ slug: 'ana' })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
