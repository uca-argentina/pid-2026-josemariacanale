import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { updateBranchController } from '@/src/interface-adapters/controllers/branches/update-branch.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = { id: 10, slug: 'norte', description: null };
const branch = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'norte', description: null };

describe('updateBranchController', () => {
    it('returns the presented Sucursal, without businessId', async () => {
        const presented = { ...branch, businessId: undefined };
        const useCase = jest.fn().mockResolvedValue(branch);

        await expect(updateBranchController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual(presented);
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['a missing id', { ...input, id: undefined }],
        ['a non-string slug', { ...input, slug: 3 }],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(updateBranchController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(updateBranchController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
