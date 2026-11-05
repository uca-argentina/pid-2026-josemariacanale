import {
  DatabaseOperationError,
  ExternalServiceError,
} from '../../domain/errors';
import { ServiceCategory } from '../../domain/services/service';
import {
  ANA,
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  bearer,
  BRUNO,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
  cancelledBookings,
} from '../../test-app';

const OTHER_EMPLOYEE = {
  id: 2,
  userId: BRUNO.id,
  businessId: ANAS_BUSINESS.id,
  name: BRUNO.name,
  email: BRUNO.email,
  imageUrl: BRUNO.imageUrl,
  deletedAt: null,
  branchIds: [ANAS_BRANCH.id],
};

describe('Empleado', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/employees', () => {
    const INVITATION = {
      id: 5,
      businessId: ANAS_BUSINESS.id,
      email: BRUNO.email,
      expiresAt: new Date('2026-01-08T12:00:00.000Z'),
      branchIds: [ANAS_BRANCH.id],
    };
    const post = (email = BRUNO.email, branchIds?: unknown) =>
      t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send(branchIds === undefined ? { email } : { email, branchIds });
    const SECOND_BRANCH = { ...ANAS_BRANCH, id: ANAS_BRANCH.id + 1 };

    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.listActiveByBusiness.mockResolvedValue([ANAS_EMPLOYEE]);
      t.invitations.findPending.mockResolvedValue(null);
      t.invitations.create.mockResolvedValue(INVITATION);
      t.users.findByEmail.mockResolvedValue(null);
      t.branches.listByBusiness.mockResolvedValue([ANAS_BRANCH]);
    });

    it('creates an Invitaci�n that expires in 7 days and has Clerk mail an email with no Usuario', async () => {
      const res = await post().expect(201);

      expect(t.clerkAuth.inviteByEmail).toHaveBeenCalledWith(BRUNO.email);
      expect(t.invitations.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        email: BRUNO.email,
        expiresAt: new Date('2026-01-08T12:00:00.000Z'),
        branchIds: [ANAS_BRANCH.id],
      });
      expect(res.body).toEqual({
        id: 5,
        email: BRUNO.email,
        expiresAt: '2026-01-08T12:00:00.000Z',
        branchIds: [ANAS_BRANCH.id],
      });
    });

    it('sends the Invitación to the only Sucursal when branchIds is missing and the Negocio has one', async () => {
      await post().expect(201);

      expect(t.invitations.create).toHaveBeenCalledWith(
        expect.objectContaining({ branchIds: [ANAS_BRANCH.id] }),
      );
    });

    it('sends the Invitación to the chosen Sucursales of a Negocio with several', async () => {
      t.branches.listByBusiness.mockResolvedValue([ANAS_BRANCH, SECOND_BRANCH]);

      await post(BRUNO.email, [SECOND_BRANCH.id]).expect(201);

      expect(t.invitations.create).toHaveBeenCalledWith(
        expect.objectContaining({ branchIds: [SECOND_BRANCH.id] }),
      );
    });

    it.each([undefined, []])(
      'answers 400 and calls neither Clerk nor the repository when branchIds is %j and the Negocio has several Sucursales',
      async (branchIds) => {
        t.branches.listByBusiness.mockResolvedValue([
          ANAS_BRANCH,
          SECOND_BRANCH,
        ]);

        const res = await post(BRUNO.email, branchIds).expect(400);

        expect(res.body.message).toBe('branchIds must have at least one Branch');
        expect(t.clerkAuth.inviteByEmail).not.toHaveBeenCalled();
        expect(t.invitations.create).not.toHaveBeenCalled();
      },
    );

    it('answers 422 and calls neither Clerk nor the repository when a Sucursal is of another Negocio', async () => {
      const res = await post(BRUNO.email, [99]).expect(422);

      expect(res.body.message).toBe(
        `Branch 99 is not a Branch of Business ${ANAS_BUSINESS.id}`,
      );
      expect(t.clerkAuth.inviteByEmail).not.toHaveBeenCalled();
      expect(t.invitations.create).not.toHaveBeenCalled();
    });

    it.each([
      ['not an array', 1],
      ['not integers', ['1']],
      ['repeated', [ANAS_BRANCH.id, ANAS_BRANCH.id]],
    ])('answers 400 when branchIds are %s', async (_, branchIds) => {
      await post(BRUNO.email, branchIds).expect(400);

      expect(t.invitations.create).not.toHaveBeenCalled();
    });

    it('replaces the Sucursales of an already pending Invitación when inviting again', async () => {
      t.branches.listByBusiness.mockResolvedValue([ANAS_BRANCH, SECOND_BRANCH]);
      t.invitations.findPending.mockResolvedValue(INVITATION);

      const res = await post(BRUNO.email, [SECOND_BRANCH.id]).expect(200);

      expect(t.invitations.replaceBranches).toHaveBeenCalledWith(
        INVITATION.id,
        [SECOND_BRANCH.id],
      );
      expect(res.body.branchIds).toEqual([SECOND_BRANCH.id]);
      expect(t.invitations.create).not.toHaveBeenCalled();
    });

    it('creates the Invitaci�n without mail when the email already has a Usuario', async () => {
      t.users.findByEmail.mockResolvedValue(BRUNO);

      await post().expect(201);

      expect(t.clerkAuth.inviteByEmail).not.toHaveBeenCalled();
      expect(t.invitations.create).toHaveBeenCalled();
    });

    it('compares the email without regard to case', async () => {
      await post('  Bruno@Example.COM ').expect(201);

      expect(t.invitations.findPending).toHaveBeenCalledWith(
        ANAS_BUSINESS.id,
        'bruno@example.com',
        expect.any(Date),
      );
    });

    it('answers 200 with the same Invitaci�n when it was already pending, creating no other', async () => {
      t.invitations.findPending.mockResolvedValue(INVITATION);

      const res = await post().expect(200);

      expect(res.body.id).toBe(INVITATION.id);
      expect(t.invitations.create).not.toHaveBeenCalled();
      expect(t.clerkAuth.inviteByEmail).toHaveBeenCalledWith(BRUNO.email);
    });

    it('answers 422 when the email is an active Empleado of the Negocio', async () => {
      t.employees.listActiveByBusiness.mockResolvedValue([
        ANAS_EMPLOYEE,
        OTHER_EMPLOYEE,
      ]);

      const res = await post().expect(422);

      expect(res.body.message).toContain('ya es Empleado');
      expect(t.invitations.create).not.toHaveBeenCalled();
    });

    it('answers 502 and creates nothing when Clerk fails', async () => {
      t.clerkAuth.inviteByEmail.mockRejectedValue(
        new ExternalServiceError('Clerk down'),
      );

      await post().expect(502);

      expect(t.invitations.create).not.toHaveBeenCalled();
    });

    it('answers 403 for a session that is not the Due�o', async () => {
      scriptOtherSession(t);

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ email: BRUNO.email })
        .expect(403);
      expect(t.invitations.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Business', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .post('/businesses/999/employees')
        .set(bearer(CLERK_TOKEN))
        .send({ email: BRUNO.email })
        .expect(404);
    });

    it.each([
      ['a malformed email', { email: 'bruno@' }],
      ['a missing email', {}],
      [
        'a name field: only email is accepted',
        { name: 'x', email: BRUNO.email },
      ],
    ])(
      'rejects %s with 400, without reaching the repositories',
      async (_, body) => {
        await t.http
          .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
          .set(bearer(CLERK_TOKEN))
          .send(body)
          .expect(400);

        expect(t.invitations.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /businesses/:id/invitations', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('lists the pending Invitaciones of the Negocio for the Due�o', async () => {
      t.invitations.listPending.mockResolvedValue([
        {
          id: 5,
          businessId: ANAS_BUSINESS.id,
          email: BRUNO.email,
          expiresAt: new Date('2026-01-08T12:00:00.000Z'),
          branchIds: [ANAS_BRANCH.id],
        },
      ]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/invitations`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.invitations.listPending).toHaveBeenCalledWith(
        ANAS_BUSINESS.id,
        new Date('2026-01-01T12:00:00.000Z'),
      );
      expect(res.body).toEqual([
        {
          id: 5,
          email: BRUNO.email,
          expiresAt: '2026-01-08T12:00:00.000Z',
          branchIds: [ANAS_BRANCH.id],
        },
      ]);
    });

    it('answers 403 for a session that is not the Due�o', async () => {
      await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/invitations`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);
    });
  });

  describe('invitations of the invitee', () => {
    const MINE = {
      id: 9,
      businessId: 7,
      email: ANA.email,
      expiresAt: new Date('2026-01-05T12:00:00.000Z'),
      closedAt: null,
      branchIds: [4, 2],
    };
    const auth = (req: import('supertest').Test) =>
      req.set(bearer(CLERK_TOKEN));

    beforeEach(() => {
      scriptSession(t);
      t.users.findById.mockResolvedValue({ ...ANA, email: 'Ana@Example.com' });
      t.invitations.findById.mockResolvedValue(MINE);
      t.employees.listActiveByUser.mockResolvedValue([ANAS_EMPLOYEE]);
      t.employees.create.mockResolvedValue({
        ...ANAS_EMPLOYEE,
        id: 3,
        businessId: 7,
      });
    });

    it('lists only the pending Invitaciones of the Session email, with their Negocio', async () => {
      t.invitations.listPendingByEmail.mockResolvedValue([
        {
          ...MINE,
          business: { name: 'Spa', slug: 'spa' },
          branches: [{ id: 4, name: 'Centro' }],
        },
      ]);

      const res = await auth(t.http.get('/invitations/me')).expect(200);

      expect(t.invitations.listPendingByEmail).toHaveBeenCalledWith(
        ANA.email,
        new Date('2026-01-01T12:00:00.000Z'),
      );
      expect(res.body).toEqual([
        {
          id: 9,
          business: { name: 'Spa', slug: 'spa' },
          branches: [{ id: 4, name: 'Centro' }],
        },
      ]);
    });

    it('accepting creates the Empleado and closes the Invitación', async () => {
      const res = await auth(t.http.post('/invitations/9/accept')).expect(200);

      expect(t.employees.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: ANA.id, businessId: 7 }),
      );
      expect(t.invitations.close).toHaveBeenCalledWith(9, expect.any(Date));
      expect(res.body.id).toBe(3);
    });

    it("accepting places the Empleado in the Invitación's Sucursales", async () => {
      t.employees.create.mockResolvedValue({
        ...ANAS_EMPLOYEE,
        id: 3,
        businessId: 7,
        branchIds: [2, 4],
      });

      const res = await auth(t.http.post('/invitations/9/accept')).expect(200);

      expect(t.employees.create).toHaveBeenCalledWith({
        userId: ANA.id,
        businessId: 7,
        branchIds: [4, 2],
      });
      expect(t.branches.listByBusiness).not.toHaveBeenCalled();
      expect(res.body.branchIds).toEqual([2, 4]);
    });

    it('accepting twice answers 422', async () => {
      t.employees.listActiveByUser.mockResolvedValue([
        ANAS_EMPLOYEE,
        { ...ANAS_EMPLOYEE, id: 3, businessId: 7 },
      ]);

      await auth(t.http.post('/invitations/9/accept')).expect(422);
      expect(t.employees.create).not.toHaveBeenCalled();
    });

    it('rejecting closes the Invitación without creating an Empleado', async () => {
      await auth(t.http.post('/invitations/9/reject')).expect(204);

      expect(t.invitations.close).toHaveBeenCalledWith(9, expect.any(Date));
      expect(t.employees.create).not.toHaveBeenCalled();
    });

    it('answers 404 for a missing or foreign Invitación', async () => {
      t.invitations.findById.mockResolvedValue({ ...MINE, email: BRUNO.email });
      await auth(t.http.post('/invitations/9/accept')).expect(404);
      t.invitations.findById.mockResolvedValue(null);
      await auth(t.http.post('/invitations/9/reject')).expect(404);
    });

    it('answers 422 "La invitación venció" for an expired one', async () => {
      t.invitations.findById.mockResolvedValue({
        ...MINE,
        expiresAt: new Date('2026-01-01T11:00:00.000Z'),
      });

      const res = await auth(t.http.post('/invitations/9/accept')).expect(422);
      expect(res.body.message).toBe('La invitación venció');
    });
  });

  describe('resend / cancel an Invitación', () => {
    const PENDING = {
      id: 5,
      businessId: ANAS_BUSINESS.id,
      email: BRUNO.email,
      expiresAt: new Date('2026-01-02T12:00:00.000Z'),
      closedAt: null,
      branchIds: [ANAS_BRANCH.id],
    };
    const as = (token: string, req: ReturnType<typeof t.http.get>) => req.set(bearer(token));

    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.invitations.findById.mockResolvedValue(PENDING);
      t.users.findByEmail.mockResolvedValue(null);
    });

    it('resending renews the expiry to 7 days and mails a person with no Usuario', async () => {
      const res = await as(
        CLERK_TOKEN,
        t.http.post('/invitations/5/resend'),
      ).expect(200);

      expect(t.invitations.renew).toHaveBeenCalledWith(
        5,
        new Date('2026-01-08T12:00:00.000Z'),
      );
      expect(t.clerkAuth.inviteByEmail).toHaveBeenCalledWith(BRUNO.email);
      expect(res.body).toEqual({
        id: 5,
        email: BRUNO.email,
        expiresAt: '2026-01-08T12:00:00.000Z',
        branchIds: [ANAS_BRANCH.id],
      });
    });

    it('resending sends no mail when the email already has a Usuario', async () => {
      t.users.findByEmail.mockResolvedValue(BRUNO);
      await as(CLERK_TOKEN, t.http.post('/invitations/5/resend')).expect(200);

      expect(t.clerkAuth.inviteByEmail).not.toHaveBeenCalled();
      expect(t.invitations.renew).toHaveBeenCalled();
    });

    it('cancelling closes the Invitación', async () => {
      await as(CLERK_TOKEN, t.http.delete('/invitations/5')).expect(204);

      expect(t.invitations.close).toHaveBeenCalledWith(5, expect.any(Date));
    });

    it('answers 404 for a missing Invitación or one that is not of the Dueño', async () => {
      await as(OTHER_CLERK_TOKEN, t.http.post('/invitations/5/resend')).expect(
        404,
      );
      await as(OTHER_CLERK_TOKEN, t.http.delete('/invitations/5')).expect(404);
      t.invitations.findById.mockResolvedValue(null);
      await as(CLERK_TOKEN, t.http.delete('/invitations/5')).expect(404);
      expect(t.invitations.renew).not.toHaveBeenCalled();
      expect(t.invitations.close).not.toHaveBeenCalled();
    });

    it('answers 422 for an Invitación already accepted or rejected', async () => {
      t.invitations.findById.mockResolvedValue({
        ...PENDING,
        closedAt: new Date(),
      });
      await as(CLERK_TOKEN, t.http.post('/invitations/5/resend')).expect(422);
      await as(CLERK_TOKEN, t.http.delete('/invitations/5')).expect(422);
    });
  });

  describe('DELETE /employees/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.employees.findById.mockResolvedValue(OTHER_EMPLOYEE);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.listActiveByEmployee.mockResolvedValue([]);
      t.employees.retire.mockResolvedValue({
        employee: { ...OTHER_EMPLOYEE, deletedAt: new Date() },
        cancelledBookings: cancelledBookings(0),
      });
    });

    it('gives the Empleado de baja, for the Dueño', async () => {
      const res = await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.employees.retire).toHaveBeenCalledWith(
        OTHER_EMPLOYEE.id,
        expect.any(Date),
      );
      expect(res.body).toEqual({ cancelledBookings: 0 });
    });

    it('reports how many future Turnos it cancelled', async () => {
      t.employees.retire.mockResolvedValue({
        employee: { ...OTHER_EMPLOYEE, deletedAt: new Date() },
        cancelledBookings: cancelledBookings(5),
      });

      const res = await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 5 });
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledTimes(5);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        'cliente1@example.com',
        'link-cancelado-1',
      );
    });

    it('still answers 200 when a Cliente mail fails, since the Turnos are already cancelled', async () => {
      t.employees.retire.mockResolvedValue({
        employee: { ...OTHER_EMPLOYEE, deletedAt: new Date() },
        cancelledBookings: cancelledBookings(1),
      });
      t.mailer.sendBookingCancellation.mockRejectedValue(new Error('SMTP down'));

      const res = await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 1 });
    });

    it("answers 422 and changes nothing when they're the last Empleado of a Servicio not dado de baja", async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          userId: null,
          availabilityId: null,
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
          durationMinutes: 30,
          price: 20,
          depositPercent: null,
          requiresApproval: false,
          deletedAt: null,
          slug: 'haircut',
          hidden: false,
          prepMinutes: 0,
          dailyLimit: null,
          slotInterval: null,
          minimumNoticeMinutes: 0,
          repeatEveryWeeks: null,
          repeatMaxBookings: null,
          employees: [
            {
              id: OTHER_EMPLOYEE.id,
              name: OTHER_EMPLOYEE.name,
              availabilityId: 20,
              userId: OTHER_EMPLOYEE.userId,
              imageUrl: OTHER_EMPLOYEE.imageUrl,
              slug: null,
            },
          ],
          cabins: [],
        },
      ]);

      await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('gives them de baja when other Servicios have another Empleado', async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          userId: null,
          availabilityId: null,
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
          durationMinutes: 30,
          price: 20,
          depositPercent: null,
          requiresApproval: false,
          deletedAt: null,
          slug: 'haircut',
          hidden: false,
          prepMinutes: 0,
          dailyLimit: null,
          slotInterval: null,
          minimumNoticeMinutes: 0,
          repeatEveryWeeks: null,
          repeatMaxBookings: null,
          employees: [
            {
              id: OTHER_EMPLOYEE.id,
              name: OTHER_EMPLOYEE.name,
              availabilityId: 20,
              userId: OTHER_EMPLOYEE.userId,
              imageUrl: OTHER_EMPLOYEE.imageUrl,
              slug: null,
            },
            {
              id: 99,
              name: 'Someone Else',
              availabilityId: 990,
              userId: 99,
              imageUrl: null,
              slug: null,
            },
          ],
          cabins: [],
        },
      ]);

      await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.employees.retire).toHaveBeenCalled();
    });

    it('answers 422 when the Dueño tries to give themselves de baja, without retiring anyone', async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);

      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(t.services.listActiveByEmployee).not.toHaveBeenCalled();
      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/employees/${OTHER_EMPLOYEE.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .delete('/employees/999')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  describe('GET /businesses/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('lists the Business Employees not dados de baja as { id, userId, name, email, imageUrl, branchIds }', async () => {
      t.employees.listActiveByBusiness.mockResolvedValue([
        { ...ANAS_EMPLOYEE, branchIds: [1, 2] },
        {
          ...OTHER_EMPLOYEE,
          imageUrl: 'https://img.clerk.com/bruno.png',
          branchIds: [2],
        },
      ]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([
        {
          id: ANAS_EMPLOYEE.id,
          userId: ANAS_EMPLOYEE.userId,
          name: ANAS_EMPLOYEE.name,
          email: ANAS_EMPLOYEE.email,
          imageUrl: null,
          branchIds: [1, 2],
        },
        {
          id: OTHER_EMPLOYEE.id,
          userId: OTHER_EMPLOYEE.userId,
          name: OTHER_EMPLOYEE.name,
          email: OTHER_EMPLOYEE.email,
          imageUrl: 'https://img.clerk.com/bruno.png',
          branchIds: [2],
        },
      ]);
      expect(t.employees.listActiveByBusiness).toHaveBeenCalledWith(
        ANAS_BUSINESS.id,
      );
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);
    });

    it('answers 404 for an unknown Business', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .get('/businesses/999/employees')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  it('answers a database failure with a generic 500', async () => {
    scriptSession(t);
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.employees.listActiveByBusiness.mockResolvedValue([]);
    t.branches.listByBusiness.mockResolvedValue([ANAS_BRANCH]);
    t.invitations.findPending.mockResolvedValue(null);
    t.users.findByEmail.mockResolvedValue(BRUNO);
    t.invitations.create.mockRejectedValue(
      new DatabaseOperationError('Database operation failed', {
        cause: new Error('connection refused at 10.0.0.1'),
      }),
    );

    const res = await t.http
      .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
      .set(bearer(CLERK_TOKEN))
      .send({ email: BRUNO.email })
      .expect(500);

    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Database operation failed',
    });
  });
});
