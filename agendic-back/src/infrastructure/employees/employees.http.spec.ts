import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { ConflictError, DatabaseOperationError } from '../../domain/errors';
import { ServiceCategory } from '../../domain/services/service';
import {
  ANA,
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
} from '../../test-app';

const OTHER_EMPLOYEE = {
  id: 2,
  userId: BRUNO.id,
  businessId: ANAS_BUSINESS.id,
  name: BRUNO.name,
  email: BRUNO.email,
  retiredAt: null,
};

describe('Empleado', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.users.findByEmail.mockResolvedValue(BRUNO);
    });

    it('creates the Empleado from the email of an existing Usuario, with the default Availability, and answers 201', async () => {
      t.employees.create.mockResolvedValue(OTHER_EMPLOYEE);

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ email: BRUNO.email })
        .expect(201);

      expect(t.users.findByEmail).toHaveBeenCalledWith(BRUNO.email);
      expect(t.employees.create).toHaveBeenCalledWith({
        userId: BRUNO.id,
        businessId: ANAS_BUSINESS.id,
        availability: DEFAULT_AVAILABILITY,
      });
      expect(res.body).toEqual({
        id: OTHER_EMPLOYEE.id,
        userId: OTHER_EMPLOYEE.userId,
        name: OTHER_EMPLOYEE.name,
        email: OTHER_EMPLOYEE.email,
      });
    });

    it('passes the trimmed, lowercased email', async () => {
      t.employees.create.mockResolvedValue(OTHER_EMPLOYEE);

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ email: '  Bruno@Example.COM ' })
        .expect(201);

      expect(t.users.findByEmail).toHaveBeenCalledWith('bruno@example.com');
    });

    it('answers 422 when no Usuario has that email, and creates nothing', async () => {
      t.users.findByEmail.mockResolvedValue(null);

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ email: 'nobody@example.com' })
        .expect(422);

      expect(res.body.message).toContain('todavía no tiene cuenta en Agendic');
      expect(t.employees.create).not.toHaveBeenCalled();
    });

    it('answers 409 when the Usuario is already an active Empleado of the Negocio', async () => {
      t.employees.create.mockRejectedValue(
        new ConflictError('User already an active Employee of this Business'),
      );

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ email: BRUNO.email })
        .expect(409);
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ email: BRUNO.email })
        .expect(403);
      expect(t.employees.create).not.toHaveBeenCalled();
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

        expect(t.employees.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('DELETE /employees/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.employees.findById.mockResolvedValue(OTHER_EMPLOYEE);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.listActiveByEmployee.mockResolvedValue([]);
      t.employees.retire.mockResolvedValue({
        employee: { ...OTHER_EMPLOYEE, retiredAt: new Date() },
        cancelledBookings: 0,
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
        employee: { ...OTHER_EMPLOYEE, retiredAt: new Date() },
        cancelledBookings: 5,
      });

      const res = await t.http
        .delete(`/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 5 });
    });

    it("answers 422 and changes nothing when they're the last Empleado of a Servicio not dado de baja", async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
          durationMinutes: 30,
          price: 20,
          depositPercent: null,
          retiredAt: null,
          employees: [{ id: OTHER_EMPLOYEE.id, name: OTHER_EMPLOYEE.name }],
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
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
          durationMinutes: 30,
          price: 20,
          depositPercent: null,
          retiredAt: null,
          employees: [
            { id: OTHER_EMPLOYEE.id, name: OTHER_EMPLOYEE.name },
            { id: 99, name: 'Someone Else' },
          ],
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

    it('lists the Business Employees not dados de baja as { id, userId, name, email }', async () => {
      t.employees.listActiveByBusiness.mockResolvedValue([
        ANAS_EMPLOYEE,
        OTHER_EMPLOYEE,
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
        },
        {
          id: OTHER_EMPLOYEE.id,
          userId: OTHER_EMPLOYEE.userId,
          name: OTHER_EMPLOYEE.name,
          email: OTHER_EMPLOYEE.email,
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
    t.users.findByEmail.mockResolvedValue(BRUNO);
    t.employees.create.mockRejectedValue(
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
