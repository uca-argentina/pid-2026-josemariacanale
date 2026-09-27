import { getPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const publicData = {
    business: { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 },
    branches: [{ id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00' }],
    services: [
        {
            id: 100,
            branchId: 10,
            name: 'Corte',
            description: 'Corte de pelo',
            category: 'SPA' as const,
            durationMinutes: 30,
            price: 1500,
            employees: [{ id: 1, name: 'Juan' }],
        },
    ],
};

describe('getPublicBusinessController', () => {
    it('returns presented public business data on happy path', async () => {
        const useCase = jest.fn().mockResolvedValue(publicData);

        const result = await getPublicBusinessController(instrumentation, useCase)({ slug: 'estudio' });

        expect(useCase).toHaveBeenCalledWith('estudio');
        expect(result).toEqual({
            business: {
                id: 1,
                name: 'Estudio',
                description: 'Desc',
                slug: 'estudio',
            },
            branch: {
                id: 10,
                businessId: 1,
                name: 'Centro',
                address: 'Av. 1',
                opensAt: '09:00',
                closesAt: '18:00',
            },
            branches: [
                {
                    id: 10,
                    businessId: 1,
                    name: 'Centro',
                    address: 'Av. 1',
                    opensAt: '09:00',
                    closesAt: '18:00',
                },
            ],
            services: [
                {
                    id: 100,
                    branchId: 10,
                    name: 'Corte',
                    description: 'Corte de pelo',
                    category: 'SPA',
                    durationMinutes: 30,
                    price: 1500,
                    employees: [{ id: 1, name: 'Juan' }],
                },
            ],
        });
    });

    it('throws InputParseError on invalid slug and does not call useCase', async () => {
        const useCase = jest.fn();

        await expect(getPublicBusinessController(instrumentation, useCase)({ slug: 'ab' })).rejects.toBeInstanceOf(
            InputParseError,
        );
        await expect(
            getPublicBusinessController(instrumentation, useCase)({ slug: 'invalid slug with spaces' }),
        ).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('propagates NotFoundError when the useCase throws it', async () => {
        const useCase = jest.fn().mockRejectedValue(new NotFoundError('Not found'));

        await expect(
            getPublicBusinessController(instrumentation, useCase)({ slug: 'no-existe' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
