import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import { resolveBookingLinkUseCase } from '@/src/application/use-cases/businesses/resolve-booking-link.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const reposWith = (stubs: Partial<IPublicBusinessesRepository>) => stubs as IPublicBusinessesRepository;

describe('resolveBookingLinkUseCase', () => {
    it('resolves the first tramo of a Negocio', async () => {
        const resolved = { kind: 'business', business: { id: 1, slug: 'luna' } };
        const resolveSlug = jest.fn().mockResolvedValue(resolved);

        await expect(resolveBookingLinkUseCase(instrumentation, reposWith({ resolveSlug }))({ slug: 'luna' })).resolves.toBe(resolved);
        expect(resolveSlug).toHaveBeenCalledWith('luna');
    });

    it('resolves the first tramo of a Usuario', async () => {
        const resolved = { kind: 'user', user: { slug: 'ana' } };
        const resolveSlug = jest.fn().mockResolvedValue(resolved);

        await expect(resolveBookingLinkUseCase(instrumentation, reposWith({ resolveSlug }))({ slug: 'ana' })).resolves.toBe(resolved);
    });

    it('propagates the 404 of a tramo that nobody has', async () => {
        const resolveSlug = jest.fn().mockRejectedValue(new NotFoundError('Booking link nadie not found'));

        await expect(resolveBookingLinkUseCase(instrumentation, reposWith({ resolveSlug }))({ slug: 'nadie' })).rejects.toBeInstanceOf(NotFoundError);
    });
});
