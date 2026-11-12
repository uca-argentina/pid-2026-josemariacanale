import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { checkSlugAvailabilityUseCase } from '@/src/application/use-cases/businesses/check-slug-availability.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { imagesStub, instrumentation } from '@/tests/unit/stubs';

const repoWith = (checkSlugAvailability: jest.Mock): IBusinessesRepository => ({
    listBusinesses: jest.fn(),
    createBusiness: jest.fn(),
    updateBusiness: jest.fn(),
    ...imagesStub,
    checkSlugAvailability,
});

describe('checkSlugAvailabilityUseCase', () => {
    it('asks the repository whether the slug is available', async () => {
        const checkSlugAvailability = jest.fn().mockResolvedValue({ available: false, reason: 'taken' });

        await expect(checkSlugAvailabilityUseCase(instrumentation, repoWith(checkSlugAvailability))('estudio')).resolves.toEqual({
            available: false,
            reason: 'taken',
        });
        expect(checkSlugAvailability).toHaveBeenCalledWith('estudio');
    });

    it('lets ApiRequestError through', async () => {
        const repo = repoWith(jest.fn().mockRejectedValue(new ApiRequestError('down')));

        await expect(checkSlugAvailabilityUseCase(instrumentation, repo)('estudio')).rejects.toBeInstanceOf(ApiRequestError);
    });
});
