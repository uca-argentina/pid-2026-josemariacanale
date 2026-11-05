import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import { markBadgesSeenUseCase } from '@/src/application/use-cases/badges/mark-badges-seen.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const badgesWith = (stubs: Partial<IBadgesRepository>) => stubs as IBadgesRepository;

describe('markBadgesSeenUseCase', () => {
    it('asks the back to mark every Nivel as seen', async () => {
        const markBadgesSeen = jest.fn().mockResolvedValue(undefined);

        await markBadgesSeenUseCase(instrumentation, badgesWith({ markBadgesSeen }))();

        expect(markBadgesSeen).toHaveBeenCalledTimes(1);
    });

    it('propagates a failure of the back', async () => {
        const repo = badgesWith({ markBadgesSeen: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(markBadgesSeenUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
