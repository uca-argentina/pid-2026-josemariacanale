import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createBranchController } from '@/src/interface-adapters/controllers/branches/create-branch.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = { businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro' };

describe('createBranchController', () => {
    it('returns the presented Sucursal, without businessId', async () => {
        const fields = { ...input, businessId: undefined };
        const useCase = jest.fn().mockResolvedValue({ ...input, id: 10, description: null });

        await expect(createBranchController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({
            ...fields,
            id: 10,
            description: null,
        });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['a missing businessId', { ...input, businessId: undefined }],
        ['a non-string slug', { ...input, slug: 3 }],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(createBranchController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(createBranchController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
