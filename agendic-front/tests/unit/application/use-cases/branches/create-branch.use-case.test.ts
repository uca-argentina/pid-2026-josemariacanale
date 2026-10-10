import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import { createBranchUseCase } from '@/src/application/use-cases/branches/create-branch.use-case';
import { SlugTakenError } from '@/src/entities/errors/business';
import { instrumentation } from '@/tests/unit/stubs';

const input = { businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro' };
const branch = { ...input, id: 10, description: null };
const repoWith = (createBranch: jest.Mock): IBranchesRepository => ({ createBranch, updateBranch: jest.fn() });

describe('createBranchUseCase', () => {
    it('creates the Sucursal through the repository', async () => {
        const createBranch = jest.fn().mockResolvedValue(branch);

        await expect(createBranchUseCase(instrumentation, repoWith(createBranch))(input)).resolves.toEqual(branch);
        expect(createBranch).toHaveBeenCalledWith(input);
    });

    it('lets SlugTakenError through', async () => {
        const repo = repoWith(jest.fn().mockRejectedValue(new SlugTakenError('x')));

        await expect(createBranchUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(SlugTakenError);
    });
});
