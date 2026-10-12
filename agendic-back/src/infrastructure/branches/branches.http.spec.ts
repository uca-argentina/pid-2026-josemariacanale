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
  logoUrl: null,
};

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const IMAGE = { content: PNG, contentType: 'image/png' };

const BRANCH = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  description: null,
  ...VALID_BRANCH,
};

describe('Sucursal', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/branches', () => {
    const URLS = ['https://files.example.com/a', 'https://files.example.com/b'];

    /** A multipart create: the Sucursal's fields as JSON in `data`, each image in `images`. */
    const post = (
      data: unknown,
      images: { content: Buffer; contentType: string }[] = [IMAGE],
      businessId = ANAS_BUSINESS.id,
      token = CLERK_TOKEN,
    ) => {
      let req = t.http
        .post(`/businesses/${businessId}/branches`)
        .set(bearer(token))
        .field('data', typeof data === 'string' ? data : JSON.stringify(data));
      for (const [i, image] of images.entries())
        req = req.attach('images', image.content, {
          filename: `image-${i}.png`,
          contentType: image.contentType,
        });
      return req;
    };

    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      let uploaded = 0;
      t.fileStorage.upload.mockImplementation(async () => URLS[uploaded++]);
      t.fileStorage.delete.mockResolvedValue();
      t.branches.createWithImages.mockImplementation(async (data, urls) => ({
        branch: { id: 1, description: null, ...data },
        images: urls.map((url, order) => ({
          id: 10 + order,
          branchId: 1,
          url,
          order,
        })),
      }));
    });

    it('creates a Sucursal with its images in the order sent, for the Dueño', async () => {
      const res = await post(VALID_BRANCH, [IMAGE, IMAGE]).expect(201);

      expect(t.fileStorage.upload).toHaveBeenCalledTimes(2);
      expect(t.fileStorage.upload).toHaveBeenCalledWith({
        content: expect.any(Uint8Array),
        contentType: 'image/png',
      });
      expect(t.branches.createWithImages).toHaveBeenCalledWith(
        { businessId: ANAS_BUSINESS.id, ...VALID_BRANCH },
        URLS,
      );
      expect(res.body).toEqual({
        ...BRANCH,
        images: [
          { id: 10, branchId: 1, url: URLS[0], order: 0 },
          { id: 11, branchId: 1, url: URLS[1], order: 1 },
        ],
      });
      expect(t.fileStorage.delete).not.toHaveBeenCalled();
    });

    it('creates a Sucursal with five images', async () => {
      t.fileStorage.upload.mockResolvedValue(URLS[0]);

      const res = await post(VALID_BRANCH, Array(5).fill(IMAGE)).expect(201);

      expect(res.body.images).toHaveLength(5);
    });

    it('creates a Sucursal with a description, blank stored as null', async () => {
      await post({ ...VALID_BRANCH, description: 'Sede central' }).expect(201);
      await post({ ...VALID_BRANCH, description: '  ' }).expect(201);

      expect(t.branches.createWithImages).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ description: 'Sede central' }),
        expect.any(Array),
      );
      expect(t.branches.createWithImages).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ description: null }),
        expect.any(Array),
      );
    });

    it('stores the slug in lowercase', async () => {
      await post({ ...VALID_BRANCH, slug: 'DownTown' }).expect(201);

      expect(t.branches.createWithImages).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'downtown' }),
        expect.any(Array),
      );
    });

    it('answers 409 when the slug is already in use in the same Negocio, deleting the uploaded files', async () => {
      t.branches.createWithImages.mockRejectedValue(
        new ConflictError('Booking link already in use'),
      );

      const res = await post(VALID_BRANCH, [IMAGE, IMAGE]).expect(409);

      expect(res.body.message).toBe('Booking link already in use');
      expect(t.fileStorage.delete).toHaveBeenCalledWith(URLS[0]);
      expect(t.fileStorage.delete).toHaveBeenCalledWith(URLS[1]);
    });

    it('deletes the files already uploaded when another upload fails', async () => {
      t.fileStorage.upload
        .mockResolvedValueOnce(URLS[0])
        .mockRejectedValueOnce(new Error('storage down'));

      await post(VALID_BRANCH, [IMAGE, IMAGE]).expect(500);

      expect(t.branches.createWithImages).not.toHaveBeenCalled();
      expect(t.fileStorage.delete).toHaveBeenCalledWith(URLS[0]);
    });

    it('still answers the 409 when an uploaded file cannot be deleted', async () => {
      t.branches.createWithImages.mockRejectedValue(
        new ConflictError('Booking link already in use'),
      );
      t.fileStorage.delete.mockRejectedValue(new Error('storage down'));

      await post(VALID_BRANCH).expect(409);
    });

    it('creates Sucursales with the same slug in different Negocios', async () => {
      t.businesses.findById.mockImplementation(async (id) =>
        id === BRUNOS_BUSINESS.id ? BRUNOS_BUSINESS : ANAS_BUSINESS,
      );

      await post(VALID_BRANCH).expect(201);
      const res = await post(
        VALID_BRANCH,
        [IMAGE],
        BRUNOS_BUSINESS.id,
        OTHER_CLERK_TOKEN,
      ).expect(201);

      expect(res.body).toMatchObject({
        businessId: BRUNOS_BUSINESS.id,
        slug: VALID_BRANCH.slug,
      });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .field('data', JSON.stringify(VALID_BRANCH))
        .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' })
        .expect(401);
    });

    it('answers 403 for another Usuario, uploading nothing', async () => {
      await post(
        VALID_BRANCH,
        [IMAGE],
        ANAS_BUSINESS.id,
        OTHER_CLERK_TOKEN,
      ).expect(403);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branches.createWithImages).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Negocio, uploading nothing', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await post(VALID_BRANCH, [IMAGE], 999).expect(404);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
    });

    it('answers 400 without images, creating nothing', async () => {
      const res = await post(VALID_BRANCH, []).expect(400);

      expect(res.body.message).toBe('At least one image is required');
      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branches.createWithImages).not.toHaveBeenCalled();
    });

    it('answers 400 for more than five images, creating nothing', async () => {
      const res = await post(VALID_BRANCH, Array(6).fill(IMAGE)).expect(400);

      expect(res.body.message).toBe('Unexpected field - images');

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branches.createWithImages).not.toHaveBeenCalled();
    });

    it('answers 400 for a file that is not an image, creating nothing', async () => {
      const res = await post(VALID_BRANCH, [
        IMAGE,
        { content: Buffer.from('%PDF'), contentType: 'application/pdf' },
      ]).expect(400);

      expect(res.body.message).toBe(
        'La imagen tiene que ser JPEG, PNG, WebP o GIF',
      );
      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branches.createWithImages).not.toHaveBeenCalled();
    });

    it('answers 413 for an image over 5 MB, creating nothing', async () => {
      await post(VALID_BRANCH, [
        {
          content: Buffer.alloc(5 * 1024 * 1024 + 1),
          contentType: 'image/png',
        },
      ]).expect(413);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branches.createWithImages).not.toHaveBeenCalled();
    });

    it.each([
      ['data that is not JSON', '{name: Downtown'],
      ['data that is not an object', '"Downtown"'],
      ['no data', undefined],
    ])('answers 400 for %s, creating nothing', async (_, data) => {
      let req = t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN));
      if (data !== undefined) req = req.field('data', data);
      await req
        .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' })
        .expect(400);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branches.createWithImages).not.toHaveBeenCalled();
    });

    it('answers 400 for a field data does not allow', async () => {
      await post({ ...VALID_BRANCH, ownerId: 7 }).expect(400);

      expect(t.branches.createWithImages).not.toHaveBeenCalled();
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
    ])(
      'rejects %s with 400, without uploading or reaching the repository',
      async (_, override) => {
        await post({ ...VALID_BRANCH, ...override }).expect(400);

        expect(t.fileStorage.upload).not.toHaveBeenCalled();
        expect(t.branches.createWithImages).not.toHaveBeenCalled();
      },
    );
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

    it('edits the description and removes it with null', async () => {
      t.branches.update.mockResolvedValue({ ...BRANCH, description: 'Nueva' });

      const res = await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ description: 'Nueva' })
        .expect(200);
      expect(res.body.description).toBe('Nueva');

      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ description: null })
        .expect(200);
      expect(t.branches.update).toHaveBeenLastCalledWith(BRANCH.id, {
        description: null,
      });
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
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, body) => {
        await t.http
          .patch(`/branches/${BRANCH.id}`)
          .set(bearer(CLERK_TOKEN))
          .send(body)
          .expect(400);

        expect(t.branches.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /businesses/:id/branches', () => {
    it("lists a Negocio's Sucursales without a Sesión", async () => {
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
