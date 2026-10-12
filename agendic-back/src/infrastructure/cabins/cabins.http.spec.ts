import { Cabin } from '../../domain/cabins/cabin';
import { ConflictError } from '../../domain/errors';
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

const BOX: Cabin = {
  id: 10,
  branchId: ANAS_BRANCH.id,
  name: 'Box 1',
  deletedAt: null,
};
const LASER: Cabin = { ...BOX, id: 11, name: 'Láser' };
const RETIRED: Cabin = { ...BOX, id: 12, deletedAt: new Date('2026-01-01') };

const inUse = (name: string) =>
  new ConflictError(
    `Cabin name ${name} already in use in Branch ${ANAS_BRANCH.id}`,
  );

describe('Cabinas', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.branches.findById.mockImplementation(async (id) =>
      id === ANAS_BRANCH.id ? ANAS_BRANCH : null,
    );
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.cabins.findById.mockImplementation(
      async (id) => [BOX, LASER, RETIRED].find((c) => c.id === id) ?? null,
    );
    t.cabins.listActiveByBranch.mockResolvedValue([BOX, LASER]);
    t.cabins.create.mockImplementation(async (branchId, name) => ({
      ...BOX,
      id: 20,
      branchId,
      name,
    }));
    t.cabins.rename.mockImplementation(async (cabin, name) => ({
      ...cabin,
      name,
    }));
    t.cabins.retire.mockResolvedValue();
  });
  afterEach(() => t.app.close());

  it('answers 404 on every write when the Negocio was dado de baja', async () => {
    t.businesses.findById.mockResolvedValue(null);
    const as = bearer(CLERK_TOKEN);

    await t.http
      .post(`/branches/${ANAS_BRANCH.id}/cabins`)
      .set(as)
      .send({ name: 'Box 2' })
      .expect(404);
    await t.http
      .patch(`/cabins/${BOX.id}`)
      .set(as)
      .send({ name: 'x' })
      .expect(404);
    await t.http.delete(`/cabins/${BOX.id}`).set(as).expect(404);

    expect(t.cabins.create).not.toHaveBeenCalled();
    expect(t.cabins.rename).not.toHaveBeenCalled();
    expect(t.cabins.retire).not.toHaveBeenCalled();
  });

  describe('GET /branches/:id/cabins', () => {
    it('lists the active ones without exposing deletedAt', async () => {
      const res = await t.http
        .get(`/branches/${ANAS_BRANCH.id}/cabins`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.cabins.listActiveByBranch).toHaveBeenCalledWith(ANAS_BRANCH.id);
      expect(res.body).toEqual([
        { id: BOX.id, branchId: ANAS_BRANCH.id, name: 'Box 1' },
        { id: LASER.id, branchId: ANAS_BRANCH.id, name: 'Láser' },
      ]);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get(`/branches/${ANAS_BRANCH.id}/cabins`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .get(`/branches/${ANAS_BRANCH.id}/cabins`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);
    });

    it('answers 404 for an unknown Sucursal', async () => {
      await t.http
        .get('/branches/999/cabins')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 404 when the Negocio was dado de baja', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .get(`/branches/${ANAS_BRANCH.id}/cabins`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  describe('POST /branches/:id/cabins', () => {
    const post = (body: object, token = CLERK_TOKEN) =>
      t.http
        .post(`/branches/${ANAS_BRANCH.id}/cabins`)
        .set(bearer(token))
        .send(body);

    it('creates it with the trimmed name', async () => {
      const res = await post({ name: '  Box 2  ' }).expect(201);

      expect(t.cabins.create).toHaveBeenCalledWith(ANAS_BRANCH.id, 'Box 2');
      expect(res.body).toEqual({
        id: 20,
        branchId: ANAS_BRANCH.id,
        name: 'Box 2',
      });
    });

    it('accepts a name of 60 characters', async () => {
      await post({ name: 'a'.repeat(60) }).expect(201);
    });

    it.each([
      ['missing', {}],
      ['empty', { name: '' }],
      ['blank', { name: '   ' }],
      ['over 60 characters', { name: 'a'.repeat(61) }],
      ['not a string', { name: 7 }],
    ])('answers 400 for a name that is %s', async (_, body) => {
      await post(body).expect(400);
      expect(t.cabins.create).not.toHaveBeenCalled();
    });

    it('answers 409 when the name is in use', async () => {
      t.cabins.create.mockRejectedValue(inUse('box 1'));

      const res = await post({ name: 'box 1' }).expect(409);

      expect(res.body.message).toBe(
        `Cabin name box 1 already in use in Branch ${ANAS_BRANCH.id}`,
      );
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/branches/${ANAS_BRANCH.id}/cabins`)
        .send({ name: 'Box 2' })
        .expect(401);
    });

    it('answers 403 for another Usuario, creating nothing', async () => {
      await post({ name: 'Box 2' }, OTHER_CLERK_TOKEN).expect(403);
      expect(t.cabins.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Sucursal', async () => {
      await t.http
        .post('/branches/999/cabins')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Box 2' })
        .expect(404);
    });
  });

  describe('PATCH /cabins/:id', () => {
    const patch = (id: number, body: object, token = CLERK_TOKEN) =>
      t.http.patch(`/cabins/${id}`).set(bearer(token)).send(body);

    it('renames it', async () => {
      const res = await patch(BOX.id, { name: ' Box A ' }).expect(200);

      expect(t.cabins.rename).toHaveBeenCalledWith(BOX, 'Box A');
      expect(res.body).toEqual({
        id: BOX.id,
        branchId: ANAS_BRANCH.id,
        name: 'Box A',
      });
    });

    it.each([
      ['missing', {}],
      ['blank', { name: '  ' }],
      ['over 60 characters', { name: 'a'.repeat(61) }],
    ])('answers 400 for a name that is %s', async (_, body) => {
      await patch(BOX.id, body).expect(400);
      expect(t.cabins.rename).not.toHaveBeenCalled();
    });

    it('answers 409 when the name is in use', async () => {
      t.cabins.rename.mockRejectedValue(inUse('Láser'));

      await patch(BOX.id, { name: 'Láser' }).expect(409);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.patch(`/cabins/${BOX.id}`).send({ name: 'x' }).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await patch(BOX.id, { name: 'x' }, OTHER_CLERK_TOKEN).expect(403);
      expect(t.cabins.rename).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown or dada de baja Cabina', async () => {
      await patch(999, { name: 'x' }).expect(404);
      await patch(RETIRED.id, { name: 'x' }).expect(404);
      expect(t.cabins.rename).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /cabins/:id', () => {
    const del = (id: number, token = CLERK_TOKEN) =>
      t.http.delete(`/cabins/${id}`).set(bearer(token));

    it('retires it with 204', async () => {
      await del(BOX.id).expect(204);

      expect(t.cabins.retire).toHaveBeenCalledWith(BOX.id);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/cabins/${BOX.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await del(BOX.id, OTHER_CLERK_TOKEN).expect(403);
      expect(t.cabins.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown or already dada de baja Cabina', async () => {
      await del(999).expect(404);
      await del(RETIRED.id).expect(404);
      expect(t.cabins.retire).not.toHaveBeenCalled();
    });
  });
});
