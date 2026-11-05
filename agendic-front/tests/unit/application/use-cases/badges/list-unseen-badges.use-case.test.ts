import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import { listUnseenBadgesUseCase } from '@/src/application/use-cases/badges/list-unseen-badges.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const badgesWith = (stubs: Partial<IBadgesRepository>) => stubs as IBadgesRepository;

describe('listUnseenBadgesUseCase', () => {
    it('returns the unseen Niveles as the back sent them', async () => {
        const unseen = [{ badge: 'attended', name: 'Turnos atendidos', level: 'bronze', earnedAt: '2026-10-01T10:00:00.000Z' }];
        const repo = badgesWith({ listUnseenBadges: jest.fn().mockResolvedValue(unseen) });

        await expect(listUnseenBadgesUseCase(instrumentation, repo)()).resolves.toBe(unseen);
    });

    it('propagates a failure of the back', async () => {
        const repo = badgesWith({ listUnseenBadges: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(listUnseenBadgesUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
