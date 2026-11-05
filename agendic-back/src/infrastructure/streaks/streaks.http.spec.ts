import { Test } from 'supertest';
import { Employee } from '../../domain/employees/employee';
import { Service } from '../../domain/services/service';
import {
  OwnedStreakReward,
  StreakProgram,
  StreakRewardType,
} from '../../domain/streaks/streak-program';
import {
  ANA,
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  BRUNO,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
} from '../../test-app';

const ANAS_OWNER = { kind: 'business', businessId: ANAS_BUSINESS.id } as const;

const TEN_PERCENT: OwnedStreakReward = {
  id: 7,
  owner: ANAS_OWNER,
  requiredCount: 5,
  repeatable: false,
  type: StreakRewardType.PERCENT_DISCOUNT,
  value: 10,
  description: null,
  service: null,
  validForDays: null,
  deletedAt: null,
};

const PROGRAM: StreakProgram = {
  active: true,
  burnAfterDays: 45,
  rewards: [TEN_PERCENT],
};

const BRUNO_AS_EMPLOYEE: Employee = {
  ...ANAS_EMPLOYEE,
  id: 2,
  userId: BRUNO.id,
  name: BRUNO.name,
  email: BRUNO.email,
};

const PERSONAL_SERVICE: Service = {
  ...ANAS_SERVICE,
  id: 2,
  branchId: null,
  userId: ANA.id,
  name: 'Clase particular',
  employees: [],
};

const PRESENTED_REWARD = {
  id: 7,
  requiredCount: 5,
  repeatable: false,
  type: 'PERCENT_DISCOUNT',
  value: 10,
  description: null,
  service: null,
  validForDays: null,
};

const NOT_THE_DUENO = `Only the Dueño of Business ${ANAS_BUSINESS.id} can change its Rachas`;

describe('Rachas: programa y Recompensas', () => {
  let t: TestApp;
  const ana = bearer(CLERK_TOKEN);
  const bruno = bearer(OTHER_CLERK_TOKEN);

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.businesses.findById.mockImplementation(async (id) =>
      id === ANAS_BUSINESS.id ? ANAS_BUSINESS : null,
    );
    t.branches.findById.mockImplementation(async (id) =>
      id === ANAS_BRANCH.id ? ANAS_BRANCH : null,
    );
    t.employees.listActiveByUser.mockResolvedValue([]);
    t.services.findById.mockImplementation(
      async (id) =>
        [ANAS_SERVICE, PERSONAL_SERVICE].find((s) => s.id === id) ?? null,
    );
    t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(PROGRAM);
    t.streakPrograms.save.mockImplementation(async (_, settings) => ({
      ...PROGRAM,
      ...settings,
    }));
    t.streakPrograms.createReward.mockImplementation(
      async (owner, { serviceId, ...terms }) => ({
        ...terms,
        id: 20,
        service: serviceId ? { id: serviceId, name: 'Haircut' } : null,
      }),
    );
    t.streakPrograms.findRewardByIdIncludeProgram.mockImplementation(
      async (id) => (id === TEN_PERCENT.id ? TEN_PERCENT : null),
    );
    t.streakPrograms.updateReward.mockImplementation(
      async (id, { serviceId, ...terms }) => ({
        ...terms,
        id,
        service: serviceId ? { id: serviceId, name: 'Haircut' } : null,
      }),
    );
    t.streakPrograms.deleteReward.mockResolvedValue();
  });
  afterEach(() => t.app.close());

  describe('GET /businesses/:id/streak-program', () => {
    it('answers the Dueño with the program and its Recompensas, without internals', async () => {
      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/streak-program`)
        .set(ana)
        .expect(200);

      expect(res.body).toEqual({
        active: true,
        burnAfterDays: 45,
        rewards: [PRESENTED_REWARD],
      });
      expect(t.streakPrograms.findByOwnerIncludeRewards).toHaveBeenCalledWith(
        ANAS_OWNER,
      );
    });

    it('answers an empty, off program when there is none', async () => {
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(null);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/streak-program`)
        .set(ana)
        .expect(200);

      expect(res.body).toEqual({
        active: false,
        burnAfterDays: null,
        rewards: [],
      });
    });

    it('answers 404 when the Negocio does not exist', async () => {
      await t.http.get('/businesses/99/streak-program').set(ana).expect(404);
    });

    it('needs a Sesión', async () => {
      await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/streak-program`)
        .expect(401);
    });
  });

  describe('PUT /businesses/:id/streak-program', () => {
    const put = (body: object, as = ana) =>
      t.http
        .put(`/businesses/${ANAS_BUSINESS.id}/streak-program`)
        .set(as)
        .send(body);

    it('saves the program and answers it as the GET does', async () => {
      const res = await put({ active: false, burnAfterDays: 7 }).expect(200);

      expect(res.body).toEqual({
        active: false,
        burnAfterDays: 7,
        rewards: [PRESENTED_REWARD],
      });
      expect(t.streakPrograms.save).toHaveBeenCalledWith(ANAS_OWNER, {
        active: false,
        burnAfterDays: 7,
      });
    });

    it.each([0, 366, 1.5, null, '7'])(
      'answers 400 with burnAfterDays %p',
      async (burnAfterDays) => {
        await put({ active: true, burnAfterDays }).expect(400);
        expect(t.streakPrograms.save).not.toHaveBeenCalled();
      },
    );

    it.each([1, 365])('accepts burnAfterDays %p', async (burnAfterDays) => {
      await put({ active: true, burnAfterDays }).expect(200);
    });

    it('answers 400 without active', async () => {
      await put({ burnAfterDays: 7 }).expect(400);
    });
  });

  describe('an Empleado who is not the Dueño', () => {
    beforeEach(() => {
      t.employees.listActiveByUser.mockResolvedValue([BRUNO_AS_EMPLOYEE]);
    });

    const expectForbidden = async (test: Test) => {
      const res = await test.expect(403);
      expect(res.body.message).toBe(NOT_THE_DUENO);
    };

    it('gets 403 on every endpoint of the Negocio', async () => {
      const base = `/businesses/${ANAS_BUSINESS.id}`;
      await expectForbidden(t.http.get(`${base}/streak-program`).set(bruno));
      await expectForbidden(
        t.http
          .put(`${base}/streak-program`)
          .set(bruno)
          .send({ active: true, burnAfterDays: 7 }),
      );
      await expectForbidden(
        t.http.post(`${base}/streak-rewards`).set(bruno).send({
          requiredCount: 5,
          repeatable: false,
          type: 'GIFT',
          description: 'Un lavado',
        }),
      );
      await expectForbidden(
        t.http
          .patch(`/streak-rewards/${TEN_PERCENT.id}`)
          .set(bruno)
          .send({ requiredCount: 6 }),
      );
      await expectForbidden(
        t.http.delete(`/streak-rewards/${TEN_PERCENT.id}`).set(bruno),
      );

      expect(t.streakPrograms.save).not.toHaveBeenCalled();
      expect(t.streakPrograms.createReward).not.toHaveBeenCalled();
      expect(t.streakPrograms.updateReward).not.toHaveBeenCalled();
      expect(t.streakPrograms.deleteReward).not.toHaveBeenCalled();
    });
  });

  describe('Servicios personales: /users/me', () => {
    const owner = { kind: 'personal', userId: ANA.id } as const;

    it('GET answers the program of the Usuario of the Sesión', async () => {
      const res = await t.http
        .get('/users/me/streak-program')
        .set(ana)
        .expect(200);

      expect(res.body.rewards).toEqual([PRESENTED_REWARD]);
      expect(t.streakPrograms.findByOwnerIncludeRewards).toHaveBeenCalledWith(
        owner,
      );
    });

    it('GET answers an empty, off program when there is none', async () => {
      t.streakPrograms.findByOwnerIncludeRewards.mockResolvedValue(null);

      const res = await t.http
        .get('/users/me/streak-program')
        .set(ana)
        .expect(200);

      expect(res.body).toEqual({
        active: false,
        burnAfterDays: null,
        rewards: [],
      });
    });

    it('PUT saves it, and validates burnAfterDays', async () => {
      await t.http
        .put('/users/me/streak-program')
        .set(ana)
        .send({ active: true, burnAfterDays: 30 })
        .expect(200);
      await t.http
        .put('/users/me/streak-program')
        .set(ana)
        .send({ active: true, burnAfterDays: 366 })
        .expect(400);

      expect(t.streakPrograms.save).toHaveBeenCalledTimes(1);
      expect(t.streakPrograms.save).toHaveBeenCalledWith(owner, {
        active: true,
        burnAfterDays: 30,
      });
    });

    it('POST creates a Recompensa of a Servicio personal of their own', async () => {
      const res = await t.http
        .post('/users/me/streak-rewards')
        .set(ana)
        .send({
          requiredCount: 3,
          repeatable: true,
          type: 'FREE_SERVICE',
          serviceId: PERSONAL_SERVICE.id,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 20,
        type: 'FREE_SERVICE',
        service: { id: PERSONAL_SERVICE.id },
      });
      expect(t.streakPrograms.createReward.mock.calls[0][0]).toEqual(owner);
    });

    it.each([
      ['of a Negocio', ANAS_SERVICE.id],
      ['of someone else', 3],
      ['dado de baja', 4],
      ['that does not exist', 99],
    ])('POST answers 422 with a Servicio %s', async (_, serviceId) => {
      t.services.findById.mockImplementation(
        async (id) =>
          [
            ANAS_SERVICE,
            { ...PERSONAL_SERVICE, id: 3, userId: BRUNO.id },
            { ...PERSONAL_SERVICE, id: 4, deletedAt: new Date('2026-01-01') },
          ].find((s) => s.id === id) ?? null,
      );

      const res = await t.http
        .post('/users/me/streak-rewards')
        .set(ana)
        .send({
          requiredCount: 3,
          repeatable: true,
          type: 'FREE_SERVICE',
          serviceId,
        })
        .expect(422);

      expect(res.body.message).toBe(
        `Service ${serviceId} cannot be a free Service for this program`,
      );
    });

    it('PATCH and DELETE work on their own Recompensa, and answer 404 to anybody else', async () => {
      const personal: OwnedStreakReward = { ...TEN_PERCENT, owner };
      t.streakPrograms.findRewardByIdIncludeProgram.mockResolvedValue(personal);

      await t.http
        .patch(`/streak-rewards/${personal.id}`)
        .set(ana)
        .send({ requiredCount: 6 })
        .expect(200);
      await t.http
        .delete(`/streak-rewards/${personal.id}`)
        .set(ana)
        .expect(204);

      await t.http
        .patch(`/streak-rewards/${personal.id}`)
        .set(bruno)
        .send({ requiredCount: 6 })
        .expect(404);
      await t.http
        .delete(`/streak-rewards/${personal.id}`)
        .set(bruno)
        .expect(404);
      expect(t.streakPrograms.updateReward).toHaveBeenCalledTimes(1);
      expect(t.streakPrograms.deleteReward).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /businesses/:id/streak-rewards', () => {
    const post = (body: object) =>
      t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/streak-rewards`)
        .set(ana)
        .send(body);
    const base = { requiredCount: 5, repeatable: false };

    it('creates a Recompensa and answers it', async () => {
      const res = await post({
        ...base,
        type: 'PERCENT_DISCOUNT',
        value: 15,
        validForDays: 30,
      }).expect(201);

      expect(res.body).toEqual({
        id: 20,
        requiredCount: 5,
        repeatable: false,
        type: 'PERCENT_DISCOUNT',
        value: 15,
        description: null,
        service: null,
        validForDays: 30,
      });
      expect(t.streakPrograms.createReward).toHaveBeenCalledWith(ANAS_OWNER, {
        requiredCount: 5,
        repeatable: false,
        type: StreakRewardType.PERCENT_DISCOUNT,
        value: 15,
        description: null,
        serviceId: null,
        validForDays: 30,
      });
    });

    it.each([
      ['PERCENT_DISCOUNT', { value: 1 }],
      ['PERCENT_DISCOUNT', { value: 100 }],
      ['AMOUNT_DISCOUNT', { value: 0.5 }],
      ['GIFT', { description: 'Un lavado de cabello' }],
      ['GIFT', { description: 'x'.repeat(200) }],
      ['FREE_SERVICE', { serviceId: ANAS_SERVICE.id }],
    ])('accepts a %s with %j', async (type, fields) => {
      await post({ ...base, type, ...fields }).expect(201);
    });

    it.each([
      ['PERCENT_DISCOUNT', {}],
      ['PERCENT_DISCOUNT', { value: 0 }],
      ['PERCENT_DISCOUNT', { value: 101 }],
      ['AMOUNT_DISCOUNT', {}],
      ['AMOUNT_DISCOUNT', { value: 0 }],
      ['AMOUNT_DISCOUNT', { value: -5 }],
      ['GIFT', {}],
      ['GIFT', { description: '   ' }],
      ['GIFT', { description: 'x'.repeat(201) }],
      ['FREE_SERVICE', {}],
    ])('answers 400 to a %s with %j', async (type, fields) => {
      await post({ ...base, type, ...fields }).expect(400);
      expect(t.streakPrograms.createReward).not.toHaveBeenCalled();
    });

    it.each([
      ['no requiredCount', { requiredCount: undefined }],
      ['a requiredCount of 0', { requiredCount: 0 }],
      ['a fractional requiredCount', { requiredCount: 1.5 }],
      ['no repeatable', { repeatable: undefined }],
      ['an unknown type', { type: 'POINTS' }],
      ['no type', { type: undefined }],
      ['a validForDays of 0', { validForDays: 0 }],
      ['an unknown field', { nope: true }],
      ['a value in thousandths', { value: 10.125 }],
    ])('answers 400 with %s', async (_, fields) => {
      await post({
        ...base,
        type: 'PERCENT_DISCOUNT',
        value: 10,
        ...fields,
      }).expect(400);
    });

    it('stores as null the fields that are not of the type, and trims the regalo', async () => {
      await post({
        ...base,
        type: 'GIFT',
        value: 10,
        description: '  Un lavado  ',
        serviceId: ANAS_SERVICE.id,
      }).expect(201);

      expect(t.streakPrograms.createReward.mock.calls[0][1]).toMatchObject({
        value: null,
        description: 'Un lavado',
        serviceId: null,
      });
    });

    it.each([
      ['of another Negocio', 3],
      ['personal', PERSONAL_SERVICE.id],
      ['dado de baja', 4],
      ['that does not exist', 99],
    ])('answers 422 with a free Servicio %s', async (_, serviceId) => {
      t.services.findById.mockImplementation(
        async (id) =>
          [
            PERSONAL_SERVICE,
            { ...ANAS_SERVICE, id: 3, branchId: 50 },
            { ...ANAS_SERVICE, id: 4, deletedAt: new Date('2026-01-01') },
          ].find((s) => s.id === id) ?? null,
      );

      const res = await post({
        ...base,
        type: 'FREE_SERVICE',
        serviceId,
      }).expect(422);

      expect(res.body.message).toBe(
        `Service ${serviceId} cannot be a free Service for this program`,
      );
    });
  });

  describe('PATCH /streak-rewards/:id', () => {
    const patch = (body: object) =>
      t.http.patch(`/streak-rewards/${TEN_PERCENT.id}`).set(ana).send(body);

    it('changes what the body names and keeps the rest', async () => {
      const res = await patch({ requiredCount: 8, repeatable: true }).expect(
        200,
      );

      expect(res.body).toEqual({
        ...PRESENTED_REWARD,
        requiredCount: 8,
        repeatable: true,
      });
      expect(t.streakPrograms.updateReward).toHaveBeenCalledWith(
        TEN_PERCENT.id,
        {
          requiredCount: 8,
          repeatable: true,
          type: StreakRewardType.PERCENT_DISCOUNT,
          value: 10,
          description: null,
          serviceId: null,
          validForDays: null,
        },
      );
    });

    it('takes validForDays away with null', async () => {
      t.streakPrograms.findRewardByIdIncludeProgram.mockResolvedValue({
        ...TEN_PERCENT,
        validForDays: 30,
      });

      const res = await patch({ validForDays: null }).expect(200);

      expect(res.body.validForDays).toBeNull();
    });

    it('clears the fields of the old type when the type changes', async () => {
      const res = await patch({
        type: 'GIFT',
        description: 'Un lavado',
      }).expect(200);

      expect(res.body).toMatchObject({
        type: 'GIFT',
        value: null,
        description: 'Un lavado',
      });
    });

    it.each([
      ['a type without its field', { type: 'GIFT' }],
      ['a value out of range', { value: 101 }],
      ['the value taken away', { value: null }],
      ['a requiredCount of 0', { requiredCount: 0 }],
      ['an unknown field', { nope: true }],
    ])('answers 400 with %s', async (_, body) => {
      await patch(body).expect(400);
      expect(t.streakPrograms.updateReward).not.toHaveBeenCalled();
    });

    it('answers 422 with a free Servicio that is not of the program', async () => {
      const res = await patch({
        type: 'FREE_SERVICE',
        serviceId: PERSONAL_SERVICE.id,
      }).expect(422);

      expect(res.body.message).toBe(
        `Service ${PERSONAL_SERVICE.id} cannot be a free Service for this program`,
      );
    });

    it('lets the Dueño edit a free-Servicio Recompensa whose Servicio was dado de baja', async () => {
      t.streakPrograms.findRewardByIdIncludeProgram.mockResolvedValue({
        ...TEN_PERCENT,
        type: StreakRewardType.FREE_SERVICE,
        value: null,
        service: { id: 4, name: 'Retirado' },
      });
      t.services.findById.mockResolvedValue({
        ...ANAS_SERVICE,
        id: 4,
        deletedAt: new Date('2026-01-01'),
      });

      await patch({ requiredCount: 8 }).expect(200);
    });

    it('lets the Dueño resend the free Servicio it already has, even dado de baja', async () => {
      t.streakPrograms.findRewardByIdIncludeProgram.mockResolvedValue({
        ...TEN_PERCENT,
        type: StreakRewardType.FREE_SERVICE,
        value: null,
        service: { id: 4, name: 'Retirado' },
      });
      t.services.findById.mockResolvedValue({
        ...ANAS_SERVICE,
        id: 4,
        deletedAt: new Date('2026-01-01'),
      });

      await patch({ requiredCount: 8, serviceId: 4 }).expect(200);
    });

    it.each([
      ['does not exist', null],
      ['was borrada', { ...TEN_PERCENT, deletedAt: new Date('2026-01-01') }],
    ])('answers 404 when the Recompensa %s', async (_, found) => {
      t.streakPrograms.findRewardByIdIncludeProgram.mockResolvedValue(found);

      const res = await patch({ requiredCount: 8 }).expect(404);

      expect(res.body.message).toBe(
        `Streak reward ${TEN_PERCENT.id} not found`,
      );
    });

    it('answers 404 to a Usuario unrelated to the Negocio', async () => {
      const res = await t.http
        .patch(`/streak-rewards/${TEN_PERCENT.id}`)
        .set(bruno)
        .send({ requiredCount: 8 })
        .expect(404);

      expect(res.body.message).toBe(
        `Streak reward ${TEN_PERCENT.id} not found`,
      );
    });
  });

  describe('DELETE /streak-rewards/:id', () => {
    it('borra the Recompensa', async () => {
      await t.http
        .delete(`/streak-rewards/${TEN_PERCENT.id}`)
        .set(ana)
        .expect(204);

      expect(t.streakPrograms.deleteReward).toHaveBeenCalledWith(
        TEN_PERCENT.id,
      );
    });

    it('answers 404 when it was already borrada', async () => {
      t.streakPrograms.findRewardByIdIncludeProgram.mockResolvedValue({
        ...TEN_PERCENT,
        deletedAt: new Date('2026-01-01'),
      });

      await t.http
        .delete(`/streak-rewards/${TEN_PERCENT.id}`)
        .set(ana)
        .expect(404);
      expect(t.streakPrograms.deleteReward).not.toHaveBeenCalled();
    });

    it('answers 404 to a Usuario unrelated to the Negocio', async () => {
      await t.http
        .delete(`/streak-rewards/${TEN_PERCENT.id}`)
        .set(bruno)
        .expect(404);
      expect(t.streakPrograms.deleteReward).not.toHaveBeenCalled();
    });
  });
});
