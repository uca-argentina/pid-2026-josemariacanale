import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import { createCabinUseCase } from '@/src/application/use-cases/cabins/create-cabin.use-case';
import { listCabinsUseCase } from '@/src/application/use-cases/cabins/list-cabins.use-case';
import { renameCabinUseCase } from '@/src/application/use-cases/cabins/rename-cabin.use-case';
import { retireCabinUseCase } from '@/src/application/use-cases/cabins/retire-cabin.use-case';
import { CabinNameTakenError } from '@/src/entities/errors/cabin';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const cabin = { id: 3, branchId: 10, name: 'Box 1' };
const repoWith = (stubs: Partial<ICabinsRepository>): ICabinsRepository => ({
    listCabins: jest.fn(),
    createCabin: jest.fn(),
    renameCabin: jest.fn(),
    retireCabin: jest.fn(),
    ...stubs,
});

describe('listCabinsUseCase', () => {
    it('lists the Cabinas of the Sucursal', async () => {
        const listCabins = jest.fn().mockResolvedValue([cabin]);

        await expect(listCabinsUseCase(instrumentation, repoWith({ listCabins }))(10)).resolves.toEqual([cabin]);
        expect(listCabins).toHaveBeenCalledWith(10);
    });

    it('lets NotFoundError through', async () => {
        const repo = repoWith({ listCabins: jest.fn().mockRejectedValue(new NotFoundError('x')) });

        await expect(listCabinsUseCase(instrumentation, repo)(10)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('createCabinUseCase', () => {
    it('creates the Cabina through the repository', async () => {
        const createCabin = jest.fn().mockResolvedValue(cabin);

        await expect(createCabinUseCase(instrumentation, repoWith({ createCabin }))({ branchId: 10, name: 'Box 1' })).resolves.toEqual(cabin);
        expect(createCabin).toHaveBeenCalledWith({ branchId: 10, name: 'Box 1' });
    });

    it('lets CabinNameTakenError through', async () => {
        const repo = repoWith({ createCabin: jest.fn().mockRejectedValue(new CabinNameTakenError('x')) });

        await expect(createCabinUseCase(instrumentation, repo)({ branchId: 10, name: 'Box 1' })).rejects.toBeInstanceOf(CabinNameTakenError);
    });
});

describe('renameCabinUseCase', () => {
    it('renames the Cabina through the repository', async () => {
        const renameCabin = jest.fn().mockResolvedValue({ ...cabin, name: 'Box 2' });

        await expect(renameCabinUseCase(instrumentation, repoWith({ renameCabin }))({ id: 3, name: 'Box 2' })).resolves.toEqual({ ...cabin, name: 'Box 2' });
        expect(renameCabin).toHaveBeenCalledWith({ id: 3, name: 'Box 2' });
    });

    it('lets CabinNameTakenError and NotFoundError through', async () => {
        const taken = repoWith({ renameCabin: jest.fn().mockRejectedValue(new CabinNameTakenError('x')) });
        const missing = repoWith({ renameCabin: jest.fn().mockRejectedValue(new NotFoundError('x')) });

        await expect(renameCabinUseCase(instrumentation, taken)({ id: 3, name: 'a' })).rejects.toBeInstanceOf(CabinNameTakenError);
        await expect(renameCabinUseCase(instrumentation, missing)({ id: 3, name: 'a' })).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('retireCabinUseCase', () => {
    it('retires the Cabina through the repository', async () => {
        const retireCabin = jest.fn().mockResolvedValue(undefined);

        await retireCabinUseCase(instrumentation, repoWith({ retireCabin }))(3);
        expect(retireCabin).toHaveBeenCalledWith(3);
    });

    it('lets NotFoundError through', async () => {
        const repo = repoWith({ retireCabin: jest.fn().mockRejectedValue(new NotFoundError('x')) });

        await expect(retireCabinUseCase(instrumentation, repo)(3)).rejects.toBeInstanceOf(NotFoundError);
    });
});
