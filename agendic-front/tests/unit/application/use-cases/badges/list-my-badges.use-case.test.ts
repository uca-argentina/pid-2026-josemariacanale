import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import { listMyBadgesUseCase } from '@/src/application/use-cases/badges/list-my-badges.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const badgesWith = (stubs: Partial<IBadgesRepository>) => stubs as IBadgesRepository;

describe('listMyBadgesUseCase', () => {
    it('returns the Insignias of the Usuario as the back sent them', async () => {
        const badges = [{ badge: 'first-booking', name: 'Primer Turno', level: 'bronze', progress: null, levels: [] }];
        const repo = badgesWith({ listMyBadges: jest.fn().mockResolvedValue(badges) });

        await expect(listMyBadgesUseCase(instrumentation, repo)()).resolves.toBe(badges);
    });

    it('propagates a failure of the back', async () => {
        const repo = badgesWith({ listMyBadges: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(listMyBadgesUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
