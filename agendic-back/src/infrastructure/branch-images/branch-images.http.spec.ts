import { BranchImage } from '../../domain/branch-images/branch-image';
import { DatabaseOperationError } from '../../domain/errors';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
} from '../../test-app';

const URL_1 = 'https://files.example.com/1';
const URL_2 = 'https://files.example.com/2';

const FIRST: BranchImage = {
  id: 10,
  branchId: ANAS_BRANCH.id,
  url: URL_1,
  order: 0,
};
const SECOND: BranchImage = {
  id: 11,
  branchId: ANAS_BRANCH.id,
  url: URL_2,
  order: 1,
};

/** An image of a Sucursal that is not Ana's. */
const FOREIGN: BranchImage = {
  id: 20,
  branchId: 99,
  url: 'https://files.example.com/3',
  order: 0,
};

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('Imágenes de Sucursal', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.branches.findById.mockImplementation(async (id) =>
      id === ANAS_BRANCH.id ? ANAS_BRANCH : null,
    );
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.fileStorage.delete.mockResolvedValue();
    t.branchImages.listByBranch.mockResolvedValue([FIRST, SECOND]);
    t.branchImages.findById.mockImplementation(
      async (id) =>
        [FIRST, SECOND, FOREIGN].find((image) => image.id === id) ?? null,
    );
  });
  afterEach(() => t.app.close());

  describe('GET /branches/:id/images', () => {
    it('lists them in order, without a Sesión', async () => {
      t.branchImages.listByBranch.mockResolvedValue(
        [SECOND, FIRST].map((image, order) => ({ ...image, order })),
      );

      const res = await t.http
        .get(`/branches/${ANAS_BRANCH.id}/images`)
        .expect(200);

      expect(t.branchImages.listByBranch).toHaveBeenCalledWith(ANAS_BRANCH.id);
      expect(res.body).toEqual([
        { ...SECOND, order: 0 },
        { ...FIRST, order: 1 },
      ]);
    });

    it('answers 404 for an unknown Sucursal', async () => {
      await t.http.get('/branches/999/images').expect(404);
    });
  });

  describe('POST /branches/:id/images', () => {
    it('uploads the file and appends the image after the last one, for the Dueño', async () => {
      t.fileStorage.upload.mockResolvedValue('https://files.example.com/new');
      t.branchImages.append.mockImplementation(async (branchId, url) => ({
        id: 12,
        branchId,
        url,
        order: 2,
      }));

      const res = await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .set(bearer(CLERK_TOKEN))
        .attach('file', PNG, {
          filename: 'front.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(t.fileStorage.upload).toHaveBeenCalledWith({
        content: expect.any(Uint8Array),
        contentType: 'image/png',
      });
      expect(
        Buffer.from(t.fileStorage.upload.mock.calls[0][0].content),
      ).toEqual(PNG);
      expect(t.branchImages.append).toHaveBeenCalledWith(
        ANAS_BRANCH.id,
        'https://files.example.com/new',
      );
      expect(res.body).toEqual({
        id: 12,
        branchId: ANAS_BRANCH.id,
        url: 'https://files.example.com/new',
        order: 2,
      });
    });

    it('deletes the uploaded file when the image cannot be saved', async () => {
      t.fileStorage.upload.mockResolvedValue('https://files.example.com/new');
      t.branchImages.append.mockRejectedValue(
        new DatabaseOperationError('Database operation failed'),
      );

      const res = await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .set(bearer(CLERK_TOKEN))
        .attach('file', PNG, {
          filename: 'front.png',
          contentType: 'image/png',
        })
        .expect(500);

      expect(res.body.message).toBe('Database operation failed');
      expect(t.fileStorage.delete).toHaveBeenCalledWith(
        'https://files.example.com/new',
      );
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .attach('file', PNG, {
          filename: 'front.png',
          contentType: 'image/png',
        })
        .expect(401);
    });

    it('answers 403 for another Usuario, without uploading anything', async () => {
      await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .attach('file', PNG, {
          filename: 'front.png',
          contentType: 'image/png',
        })
        .expect(403);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
      expect(t.branchImages.append).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Sucursal', async () => {
      await t.http
        .post('/branches/999/images')
        .set(bearer(CLERK_TOKEN))
        .attach('file', PNG, {
          filename: 'front.png',
          contentType: 'image/png',
        })
        .expect(404);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
    });

    it('answers 400 without a file', async () => {
      await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .set(bearer(CLERK_TOKEN))
        .expect(400);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
    });

    it('answers 400 for a file that is not an image', async () => {
      const res = await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .set(bearer(CLERK_TOKEN))
        .attach('file', Buffer.from('%PDF'), {
          filename: 'menu.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(res.body.message).toBe(
        'La imagen tiene que ser JPEG, PNG, WebP o GIF',
      );
      expect(t.fileStorage.upload).not.toHaveBeenCalled();
    });

    it('answers 413 for an image over 5 MB', async () => {
      await t.http
        .post(`/branches/${ANAS_BRANCH.id}/images`)
        .set(bearer(CLERK_TOKEN))
        .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'big.png',
          contentType: 'image/png',
        })
        .expect(413);

      expect(t.fileStorage.upload).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /branches/:id/images/:imageId', () => {
    it('still answers 204 when the file cannot be deleted from the storage', async () => {
      t.fileStorage.delete.mockRejectedValue(new Error('storage down'));

      await t.http
        .delete(`/branches/${ANAS_BRANCH.id}/images/${FIRST.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.branchImages.delete).toHaveBeenCalledWith(FIRST.id);
    });

    it('deletes the image and its file, for the Dueño', async () => {
      await t.http
        .delete(`/branches/${ANAS_BRANCH.id}/images/${FIRST.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.branchImages.delete).toHaveBeenCalledWith(FIRST.id);
      expect(t.fileStorage.delete).toHaveBeenCalledWith(URL_1);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .delete(`/branches/${ANAS_BRANCH.id}/images/${FIRST.id}`)
        .expect(401);
    });

    it('answers 403 for another Usuario, deleting nothing', async () => {
      await t.http
        .delete(`/branches/${ANAS_BRANCH.id}/images/${FIRST.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.branchImages.delete).not.toHaveBeenCalled();
      expect(t.fileStorage.delete).not.toHaveBeenCalled();
    });

    it('answers 404 for an image of another Sucursal, deleting nothing', async () => {
      await t.http
        .delete(`/branches/${ANAS_BRANCH.id}/images/${FOREIGN.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);

      expect(t.branchImages.delete).not.toHaveBeenCalled();
      expect(t.fileStorage.delete).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown image', async () => {
      await t.http
        .delete(`/branches/${ANAS_BRANCH.id}/images/999`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  describe('PUT /branches/:id/images/order', () => {
    it('replaces the order, which the GET then returns, for the Dueño', async () => {
      const reordered = [
        { ...SECOND, order: 0 },
        { ...FIRST, order: 1 },
      ];
      t.branchImages.reorder.mockImplementation(async () => {
        t.branchImages.listByBranch.mockResolvedValue(reordered);
        return reordered;
      });

      const res = await t.http
        .put(`/branches/${ANAS_BRANCH.id}/images/order`)
        .set(bearer(CLERK_TOKEN))
        .send({ imageIds: [SECOND.id, FIRST.id] })
        .expect(200);

      expect(t.branchImages.reorder).toHaveBeenCalledWith(ANAS_BRANCH.id, [
        SECOND.id,
        FIRST.id,
      ]);
      expect(res.body).toEqual(reordered);
      const list = await t.http
        .get(`/branches/${ANAS_BRANCH.id}/images`)
        .expect(200);
      expect(list.body.map((image: BranchImage) => image.id)).toEqual([
        SECOND.id,
        FIRST.id,
      ]);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .put(`/branches/${ANAS_BRANCH.id}/images/order`)
        .send({ imageIds: [SECOND.id, FIRST.id] })
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .put(`/branches/${ANAS_BRANCH.id}/images/order`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ imageIds: [SECOND.id, FIRST.id] })
        .expect(403);

      expect(t.branchImages.reorder).not.toHaveBeenCalled();
    });

    it('answers 404 for an image of another Sucursal', async () => {
      await t.http
        .put(`/branches/${ANAS_BRANCH.id}/images/order`)
        .set(bearer(CLERK_TOKEN))
        .send({ imageIds: [SECOND.id, FIRST.id, FOREIGN.id] })
        .expect(404);

      expect(t.branchImages.reorder).not.toHaveBeenCalled();
    });

    it('answers 422 when the list leaves out one of its images', async () => {
      const res = await t.http
        .put(`/branches/${ANAS_BRANCH.id}/images/order`)
        .set(bearer(CLERK_TOKEN))
        .send({ imageIds: [SECOND.id] })
        .expect(422);

      expect(res.body.message).toBe(
        'El orden tiene que incluir todas las imágenes de la Sucursal',
      );
      expect(t.branchImages.reorder).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing list', {}],
      ['a repeated image', { imageIds: [FIRST.id, FIRST.id] }],
      ['an id that is not a number', { imageIds: ['a'] }],
    ])('rejects %s with 400', async (_, body) => {
      await t.http
        .put(`/branches/${ANAS_BRANCH.id}/images/order`)
        .set(bearer(CLERK_TOKEN))
        .send(body)
        .expect(400);

      expect(t.branchImages.reorder).not.toHaveBeenCalled();
    });
  });
});
