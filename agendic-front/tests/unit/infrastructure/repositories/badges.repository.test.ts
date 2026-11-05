import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';
import { BadgesRepository } from '@/src/infrastructure/repositories/badges.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const badge = {
    badge: 'attended',
    name: 'Turnos atendidos',
    level: 'silver',
    progress: { current: 73, target: 100 },
    levels: [
        { level: 'bronze', target: 10, earnedAt: '2026-09-01T10:00:00.000Z' },
        { level: 'silver', target: 50, earnedAt: '2026-10-01T10:00:00.000Z' },
        { level: 'gold', target: 100, earnedAt: null },
    ],
};

const repo = () => new BadgesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, 'http://api');
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BadgesRepository.listMyBadges', () => {
    it('GETs /users/me/badges with the bearer token', async () => {
        const fetchSpy = respond(200, [badge]);

        await expect(repo().listMyBadges()).resolves.toEqual([badge]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/badges', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }));
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { message: 'Unauthorized' });

        await expect(repo().listMyBadges()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates any other failure to ApiRequestError', async () => {
        respond(500, { message: 'boom' });

        await expect(repo().listMyBadges()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('rejects a body that is not a list of Insignias', async () => {
        respond(200, [{ ...badge, level: 'diamond' }]);

        await expect(repo().listMyBadges()).rejects.toThrow('unexpected body');
    });
});

const unseen = { badge: 'attended', name: 'Turnos atendidos', level: 'bronze', earnedAt: '2026-10-01T10:00:00.000Z' };

describe('BadgesRepository.listUnseenBadges', () => {
    it('GETs /users/me/badges/unseen with the bearer token', async () => {
        const fetchSpy = respond(200, [unseen]);

        await expect(repo().listUnseenBadges()).resolves.toEqual([unseen]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/badges/unseen', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }));
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { message: 'Unauthorized' });

        await expect(repo().listUnseenBadges()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates any other failure to ApiRequestError', async () => {
        respond(500, { message: 'boom' });

        await expect(repo().listUnseenBadges()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('rejects a body with an unknown Nivel', async () => {
        respond(200, [{ ...unseen, level: 'diamond' }]);

        await expect(repo().listUnseenBadges()).rejects.toThrow('unexpected body');
    });
});

describe('BadgesRepository.markBadgesSeen', () => {
    it('POSTs /users/me/badges/seen and accepts the empty 204', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

        await expect(repo().markBadgesSeen()).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/badges/seen', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }));
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { message: 'Unauthorized' });

        await expect(repo().markBadgesSeen()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates any other failure to ApiRequestError', async () => {
        respond(500, { message: 'boom' });

        await expect(repo().markBadgesSeen()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
