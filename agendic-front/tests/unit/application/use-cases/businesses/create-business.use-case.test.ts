import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { createBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { SlugTakenError } from '@/src/entities/errors/business';
import { instrumentation } from '@/tests/unit/stubs';

const input = {
    business: { name: 'Estudio', description: 'Desc', slug: 'estudio' },
    branch: { name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00' },
    service: { name: 'Consulta', category: 'CLINICA' as const, durationMinutes: 30, price: 100 },
};
const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };

describe('createBusinessUseCase', () => {
    it('creates the Negocio through the repository', async () => {
        const createBusiness = jest.fn().mockResolvedValue(business);
        const repo: IBusinessesRepository = { listBusinesses: jest.fn(), createBusiness, updateBusiness: jest.fn() };

        await expect(createBusinessUseCase(instrumentation, repo)(input)).resolves.toEqual(business);
        expect(createBusiness).toHaveBeenCalledWith(input);
    });

    it('lets SlugTakenError through', async () => {
        const repo: IBusinessesRepository = {
            listBusinesses: jest.fn(),
            createBusiness: jest.fn().mockRejectedValue(new SlugTakenError('x')),
            updateBusiness: jest.fn(),
        };

        await expect(createBusinessUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(SlugTakenError);
    });
});
