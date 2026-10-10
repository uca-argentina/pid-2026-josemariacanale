import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import { updateBranchUseCase } from '@/src/application/use-cases/branches/update-branch.use-case';
import { SlugTakenError } from '@/src/entities/errors/business';
import { instrumentation } from '@/tests/unit/stubs';

const input = { id: 10, slug: 'norte', description: null };
const branch = { ...input, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires' };
const repoWith = (updateBranch: jest.Mock): IBranchesRepository => ({ createBranch: jest.fn(), updateBranch });

describe('updateBranchUseCase', () => {
    it('updates the Sucursal through the repository', async () => {
        const updateBranch = jest.fn().mockResolvedValue(branch);

        await expect(updateBranchUseCase(instrumentation, repoWith(updateBranch))(input)).resolves.toEqual(branch);
        expect(updateBranch).toHaveBeenCalledWith(input);
    });

    it('lets SlugTakenError through', async () => {
        const repo = repoWith(jest.fn().mockRejectedValue(new SlugTakenError('x')));

        await expect(updateBranchUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(SlugTakenError);
    });
});
