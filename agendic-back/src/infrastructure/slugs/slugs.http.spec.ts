import {
  ANA,
  ANAS_BUSINESS,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  scriptSession,
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

describe('GET /slugs/:slug/availability', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    t.businesses.findBookingSlugOwner.mockResolvedValue(null);
    t.businesses.listByOwner.mockResolvedValue([]);
  });
  afterEach(() => t.app.close());

  const check = (slug: string) =>
    t.http.get(`/slugs/${slug}/availability`).set(bearer(CLERK_TOKEN));

  it('answers 401 without a Sesión', async () => {
    await t.http.get('/slugs/libre/availability').expect(401);
  });

  it('says a slug nobody has is available', async () => {
    const res = await check('libre').expect(200);

    expect(res.body).toEqual({ available: true });
  });

  it('compares the slug in lowercase', async () => {
    await check('Libre').expect(200);

    expect(t.businesses.findBookingSlugOwner).toHaveBeenCalledWith('libre');
  });

  it.each([
    ['another Negocio', { businessId: 99, userId: null }],
    ['a Usuario', { businessId: null, userId: 5 }],
  ])('says a slug of %s is taken', async (_owner, owner) => {
    t.businesses.findBookingSlugOwner.mockResolvedValue(owner);

    const res = await check('ocupado').expect(200);

    expect(res.body).toEqual({ available: false, reason: 'taken' });
  });

  it('says the slug of a Negocio dado de baja is still taken', async () => {
    // findBySlug no lo encuentra, pero la fila de BookingSlug queda (ADR 0024).
    t.businesses.findBookingSlugOwner.mockResolvedValue({
      businessId: 99,
      userId: null,
    });

    const res = await check('de-baja').expect(200);

    expect(res.body).toEqual({ available: false, reason: 'taken' });
  });

  it('says the slug of the Negocio of the Sesión is available, for Editar Negocio', async () => {
    t.businesses.findBookingSlugOwner.mockResolvedValue({
      businessId: ANAS_BUSINESS.id,
      userId: null,
    });
    t.businesses.listByOwner.mockResolvedValue([ANAS_BUSINESS]);

    const res = await check(ANAS_BUSINESS.slug).expect(200);

    expect(res.body).toEqual({ available: true });
    expect(t.businesses.listByOwner).toHaveBeenCalledWith(ANA.id);
  });

  it('says a reserved word is reserved, without searching', async () => {
    const res = await check('analytics').expect(200);

    expect(res.body).toEqual({ available: false, reason: 'reserved' });
    expect(t.businesses.findBookingSlugOwner).not.toHaveBeenCalled();
  });

  it.each(['-lead', 'has_underscore', 'a--b', 'ab', 'a'.repeat(41)])(
    'says %j is invalid, without searching',
    async (slug) => {
      const res = await check(slug).expect(200);

      expect(res.body).toEqual({ available: false, reason: 'invalid' });
      expect(t.businesses.findBookingSlugOwner).not.toHaveBeenCalled();
    },
  );
});
