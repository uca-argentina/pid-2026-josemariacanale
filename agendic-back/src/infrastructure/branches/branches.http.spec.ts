import { ConflictError } from '../../domain/errors';
import {
  ANAS_BUSINESS,
  bearer,
  createTestApp,
  BRUNO,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const VALID_BRANCH = {
  name: 'Downtown',
  address: '123 Main St',
  timeZone: 'America/Argentina/Buenos_Aires',
  slug: 'downtown',
};

/** Bruno's Negocio, for checking that a Sucursal's slug is only unique within its own Negocio. */
const BRUNOS_BUSINESS = {
  id: 2,
  name: "Bruno's Gym",
  description: 'Weights',
  ownerId: BRUNO.id,
  slug: 'brunos-gym',
  deletedAt: null,
};

const BRANCH = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  ...VALID_BRANCH,
};

describe('Sucursal', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/branches', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('creates a Sucursal, for the Dueño', async () => {
      t.branches.create.mockResolvedValue(BRANCH);

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(201);

      expect(t.branches.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        ...VALID_BRANCH,
      });
      expect(res.body).toEqual(BRANCH);
    });

    it('stores the slug in lowercase', async () => {
      t.branches.create.mockResolvedValue(BRANCH);

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_BRANCH, slug: 'DownTown' })
        .expect(201);

      expect(t.branches.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'downtown' }),
      );
    });

    it('answers 409 when the slug is already in use in the same Negocio', async () => {
      t.branches.create.mockRejectedValue(
        new ConflictError('Booking link already in use'),
      );

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(409);

      expect(res.body.message).toBe('Booking link already in use');
    });

    it('creates Sucursales with the same slug in different Negocios', async () => {
      t.businesses.findById.mockImplementation(async (id) =>
        id === BRUNOS_BUSINESS.id ? BRUNOS_BUSINESS : ANAS_BUSINESS,
      );
      t.branches.create.mockImplementation(async (data) => ({ id: 1, ...data }));

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(201);
      const res = await t.http
        .post(`/businesses/${BRUNOS_BUSINESS.id}/branches`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(201);

      expect(res.body).toMatchObject({
        businessId: BRUNOS_BUSINESS.id,
        slug: VALID_BRANCH.slug,
      });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .send(VALID_BRANCH)
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(403);

      expect(t.branches.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .post('/businesses/999/branches')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(404);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a missing name', { name: undefined }],
      ['a blank address', { address: ' ' }],
      ['a missing address', { address: undefined }],
      ['a missing timeZone', { timeZone: undefined }],
      ['a UTC offset as timeZone', { timeZone: '-03:00' }],
      ['a nonsense timeZone', { timeZone: 'Marte/Olimpo' }],
      ['a missing slug', { slug: undefined }],
      ['a slug with spaces and symbols', { slug: 'down town!' }],
      ['a slug with a leading hyphen', { slug: '-downtown' }],
      ['a slug with a double hyphen', { slug: 'down--town' }],
      ['a too short slug', { slug: 'ab' }],
      ['a too long slug', { slug: 'a'.repeat(41) }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_BRANCH, ...override })
        .expect(400);

      expect(t.branches.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /branches/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits name, address and hours, for the Dueño of its Negocio', async () => {
      t.branches.update.mockResolvedValue({ ...BRANCH, name: 'New name' });

      const res = await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(200);

      expect(t.branches.update).toHaveBeenCalledWith(BRANCH.id, {
        name: 'New name',
      });
      expect(res.body.name).toBe('New name');
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .send({ name: 'New name' })
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(403);

      expect(t.branches.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http
        .patch('/branches/999')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(404);
    });

    it('edits the slug in lowercase, for the Dueño', async () => {
      t.branches.update.mockResolvedValue({ ...BRANCH, slug: 'centro' });

      const res = await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ slug: 'Centro' })
        .expect(200);

      expect(t.branches.update).toHaveBeenCalledWith(BRANCH.id, {
        slug: 'centro',
      });
      expect(res.body.slug).toBe('centro');
    });

    it('answers 403 when another Usuario edits the slug', async () => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ slug: 'centro' })
        .expect(403);

      expect(t.branches.update).not.toHaveBeenCalled();
    });

    it('answers 409 when the slug is already in use in the same Negocio', async () => {
      t.branches.update.mockRejectedValue(
        new ConflictError('Booking link already in use'),
      );

      const res = await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ slug: 'centro' })
        .expect(409);

      expect(res.body.message).toBe('Booking link already in use');
    });

    it('edits the timeZone, for the Dueño', async () => {
      t.branches.update.mockResolvedValue({
        ...BRANCH,
        timeZone: 'America/Cordoba',
      });

      const res = await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ timeZone: 'America/Cordoba' })
        .expect(200);

      expect(t.branches.update).toHaveBeenCalledWith(BRANCH.id, {
        timeZone: 'America/Cordoba',
      });
      expect(res.body.timeZone).toBe('America/Cordoba');
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a UTC offset as timeZone', { timeZone: '-03:00' }],
      ['a nonsense timeZone', { timeZone: 'Marte/Olimpo' }],
      ['a malformed slug', { slug: 'down town!' }],
      ['a null slug', { slug: null }],
    ])('rejects %s with 400, without reaching the repository', async (_, body) => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send(body)
        .expect(400);

      expect(t.branches.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /businesses/:id/branches', () => {
    it('lists a Negocio\'s Sucursales without a Sesión', async () => {
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.branches.listByBusiness.mockResolvedValue([BRANCH]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .expect(200);

      expect(res.body).toEqual([BRANCH]);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http.get('/businesses/999/branches').expect(404);
    });
  });
});
