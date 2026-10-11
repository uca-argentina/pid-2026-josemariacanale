import {
  ANA,
  ANAS_BUSINESS,
  createTestApp,
  TestApp,
} from '../../test-app';

describe('GET /slugs/:slug', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    t.businesses.findBySlug.mockResolvedValue(null);
    t.users.findBySlug.mockResolvedValue(null);
    t.services.listActiveByUser.mockResolvedValue([]);
  });
  afterEach(() => t.app.close());

  it('says the first tramo is a Negocio, in the shape of GET /businesses/by-slug/:slug, without a Sesión', async () => {
    t.businesses.findBySlug.mockResolvedValue(ANAS_BUSINESS);

    const res = await t.http.get('/slugs/anas-salon').expect(200);

    expect(res.body).toEqual({
      kind: 'business',
      business: {
        id: ANAS_BUSINESS.id,
        name: ANAS_BUSINESS.name,
        description: ANAS_BUSINESS.description,
        ownerId: ANAS_BUSINESS.ownerId,
        slug: 'anas-salon',
        logoUrl: null,
      },
    });
  });

  it('says the first tramo is a Usuario, in the shape of GET /u/:userSlug', async () => {
    t.users.findBySlug.mockResolvedValue({ ...ANA, slug: 'ana-perez' });

    const res = await t.http.get('/slugs/ana-perez').expect(200);

    expect(res.body).toEqual({
      kind: 'user',
      user: { name: ANA.name, slug: 'ana-perez', imageUrl: null, services: [] },
    });
  });

  it('compares the slug in lowercase', async () => {
    t.businesses.findBySlug.mockResolvedValue(ANAS_BUSINESS);

    await t.http.get('/slugs/ANAS-Salon').expect(200);

    expect(t.businesses.findBySlug).toHaveBeenCalledWith('anas-salon');
  });

  it('answers 404 when nobody has the slug', async () => {
    const res = await t.http.get('/slugs/nadie').expect(404);

    expect(res.body.message).toBe('Booking link nadie not found');
  });

  it('answers 404 for a Negocio dado de baja', async () => {
    t.businesses.findBySlug.mockResolvedValue(null);

    await t.http.get('/slugs/anas-salon').expect(404);
  });

  it('answers 404 for a Usuario dado de baja', async () => {
    t.users.findBySlug.mockResolvedValue({
      ...ANA,
      slug: 'ana-perez',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await t.http.get('/slugs/ana-perez').expect(404);
  });

  it.each(['-lead', 'has_underscore', 'a--b'])(
    'answers 404 without searching when %j has no slug format',
    async (slug) => {
      await t.http.get(`/slugs/${slug}`).expect(404);

      expect(t.businesses.findBySlug).not.toHaveBeenCalled();
      expect(t.users.findBySlug).not.toHaveBeenCalled();
    },
  );
});
