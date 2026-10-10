import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { listBranchesWithImagesController } from '@/src/interface-adapters/controllers/branches/list-branches-with-images.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const branch = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro', description: null };

describe('listBranchesWithImagesController', () => {
    it('returns each Sucursal with its Imágenes, without businessId nor image order', async () => {
        const presented = { ...branch, businessId: undefined };
        const useCase = jest.fn().mockResolvedValue([{ branch, images: [{ id: 1, branchId: 10, url: 'a.jpg', order: 1 }] }]);

        await expect(listBranchesWithImagesController(instrumentation, signedIn(), useCase)({ businessId: 1 })).resolves.toEqual([
            { ...presented, images: [{ id: 1, url: 'a.jpg' }] },
        ]);
        expect(useCase).toHaveBeenCalledWith(1);
    });

    it.each([
        ['a missing businessId', {}],
        ['a non-numeric businessId', { businessId: 'x' }],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(listBranchesWithImagesController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listBranchesWithImagesController(instrumentation, auth, useCase)({ businessId: 1 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
