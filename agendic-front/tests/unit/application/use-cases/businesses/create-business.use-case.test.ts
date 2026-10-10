import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { createBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { SlugTakenError } from '@/src/entities/errors/business';
import { imagesStub, instrumentation } from '@/tests/unit/stubs';

const input = {
    business: { name: 'Estudio', description: 'Desc', slug: 'estudio' },
    branch: { name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro' },
};
const business = {
    business: { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: null, ownerId: 7 },
    branch: { id: 3 },
};

describe('createBusinessUseCase', () => {
    it('creates the Negocio and its Sucursal through the repository', async () => {
        const createBusiness = jest.fn().mockResolvedValue(business);
        const repo: IBusinessesRepository = { listBusinesses: jest.fn(), createBusiness, updateBusiness: jest.fn(), ...imagesStub };

        await expect(createBusinessUseCase(instrumentation, repo)(input)).resolves.toEqual(business);
        expect(createBusiness).toHaveBeenCalledWith(input);
    });

    it('lets SlugTakenError through', async () => {
        const repo: IBusinessesRepository = {
            listBusinesses: jest.fn(),
            createBusiness: jest.fn().mockRejectedValue(new SlugTakenError('x')),
            updateBusiness: jest.fn(),
            ...imagesStub,
        };

        await expect(createBusinessUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(SlugTakenError);
    });
});
