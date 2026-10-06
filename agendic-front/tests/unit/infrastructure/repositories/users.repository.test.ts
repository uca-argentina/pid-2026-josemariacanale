import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { UsersRepository } from '@/src/infrastructure/repositories/users.repository';
import { authWith } from '@/tests/unit/stubs';

const personal = {
    id: 200,
    slug: 'clase',
    name: 'Clase',
    description: null,
    category: 'ACADEMIA',
    durationMinutes: 45,
    price: 5000,
    depositPercent: null,
    requiresApproval: false,
    hidden: false,
    prepMinutes: 0,
    dailyLimit: null,
    slotInterval: null,
    minimumNoticeMinutes: 0,
    availabilityId: 7,
};
/** The back sends the fields of any Servicio: the personal one drops the ones it does not have. */
const sent = { ...personal, branchId: null, userId: 3, employees: [] };

const repo = (getAccessToken = jest.fn().mockResolvedValue('tok')) =>
    new UsersRepository(authWith({ getAccessToken }), 'http://api');
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('UsersRepository.getMe', () => {
    it('GETs /users/me with the bearer token and keeps the name and the Enlace de reserva', async () => {
        const fetchSpy = respond(200, { id: 3, name: 'Ana', email: 'ana@x.com', slug: null });

        await expect(repo().getMe()).resolves.toEqual({ name: 'Ana', slug: null });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }));
    });
});

describe('UsersRepository.updateMySlug', () => {
    it('PATCHes only the slug', async () => {
        const fetchSpy = respond(200, { id: 3, name: 'Ana', email: 'ana@x.com', slug: 'ana' });

        await expect(repo().updateMySlug('ana')).resolves.toEqual({ name: 'Ana', slug: 'ana' });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me', expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ slug: 'ana' }),
        }));
    });

    it.each([
        [409, SlugTakenError],
        [400, InvalidSlugError],
        [500, ApiRequestError],
    ])('translates a %i', async (status, error) => {
        respond(status, { message: 'Booking link already in use' });

        await expect(repo().updateMySlug('ana')).rejects.toBeInstanceOf(error);
    });
});

describe('UsersRepository.getUserPage', () => {
    it('GETs /u/:userSlug without a token', async () => {
        const getAccessToken = jest.fn();
        const fetchSpy = respond(200, { name: 'Ana', slug: 'ana', services: [sent] });

        await expect(repo(getAccessToken).getUserPage('ana')).resolves.toEqual({ name: 'Ana', slug: 'ana', services: [personal] });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/u/ana', expect.objectContaining({ method: 'GET' }));
        expect(getAccessToken).not.toHaveBeenCalled();
    });

    it('turns a 404 into NotFoundError', async () => {
        respond(404, { message: 'User not found' });

        await expect(repo().getUserPage('nadie')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('turns an unexpected body into ApiRequestError', async () => {
        respond(200, { name: 'Ana' });

        await expect(repo().getUserPage('ana')).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('UsersRepository.getPersonalService', () => {
    it('GETs /u/:userSlug/:serviceSlug', async () => {
        const fetchSpy = respond(200, sent);

        await expect(repo().getPersonalService('ana', 'clase')).resolves.toEqual(personal);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/u/ana/clase', expect.anything());
    });

    it('turns a 404 into NotFoundError', async () => {
        respond(404, { message: 'Service not found' });

        await expect(repo().getPersonalService('ana', 'otra')).rejects.toBeInstanceOf(NotFoundError);
    });
});
