import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';
import { BusinessesRepository } from '@/src/infrastructure/repositories/businesses.repository';
import { authWith } from '@/tests/unit/stubs';

const input = {
    business: { name: 'Estudio', description: 'Desc', slug: 'estudio' },
    branch: { name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00' },
    service: { name: 'Consulta', category: 'CLINICA' as const, durationMinutes: 30, price: 100 },
};
const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };

const repo = () =>
    new BusinessesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), 'http://api');
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BusinessesRepository.createBusiness', () => {
    it('POSTs with the bearer token and returns the Negocio', async () => {
        const fetchSpy = respond(201, { business, branch: {}, service: {}, employee: {} });

        await expect(repo().createBusiness(input)).resolves.toEqual(business);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify(input),
            }),
        );
    });

    it('translates 409 to SlugTakenError', async () => {
        respond(409, { statusCode: 409, message: 'esa dirección ya está en uso' });
        await expect(repo().createBusiness(input)).rejects.toBeInstanceOf(SlugTakenError);
    });

    it('translates 400 to InvalidSlugError', async () => {
        respond(400, { statusCode: 400, message: 'bad' });
        await expect(repo().createBusiness(input)).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('translates other failures to ApiRequestError', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().createBusiness(input)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a network failure to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('offline'));
        await expect(repo().createBusiness(input)).rejects.toBeInstanceOf(ApiRequestError);
    });
});
