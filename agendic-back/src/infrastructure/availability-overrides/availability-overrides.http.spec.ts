import { AvailabilityOverride } from '../../domain/availability-overrides/availability-override';
import { ConflictError } from '../../domain/errors';
import { Service, ServiceCategory } from '../../domain/services/service';
import {
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  BRUNO,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

/** Another Empleado of Ana's own Negocio, who can cover for her. */
const COVERING_EMPLOYEE = {
  id: 2,
  userId: BRUNO.id,
  businessId: ANAS_BUSINESS.id,
  name: BRUNO.name,
  email: BRUNO.email,
  retiredAt: null,
};

const OTHER_SERVICE: Service = {
  id: 2,
  branchId: ANAS_SERVICE.branchId,
  name: 'Manicura',
  description: null,
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 15,
  depositPercent: null,
  requiresApproval: false,
  retiredAt: null,
  slug: 'haircut',
  hidden: false,
  employees: [
    { id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name, availabilityId: 10 },
  ],
};

const DAY_OFF: AvailabilityOverride = {
  employeeId: ANAS_EMPLOYEE.id,
  date: '2026-02-10',
  intervals: [],
  coveredByEmployeeId: null,
};

const HALF_DAY: AvailabilityOverride = {
  employeeId: ANAS_EMPLOYEE.id,
  date: '2026-02-11',
  intervals: [{ startTime: '09:00', endTime: '13:00' }],
  coveredByEmployeeId: null,
};

const presented = (override: AvailabilityOverride) => ({
  date: override.date,
  intervals: override.intervals,
  coveredByEmployeeId: override.coveredByEmployeeId,
});

describe('Anulación', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.employees.findById.mockImplementation(async (id) =>
      id === COVERING_EMPLOYEE.id ? COVERING_EMPLOYEE : ANAS_EMPLOYEE,
    );
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.services.listActiveByEmployee.mockResolvedValue([ANAS_SERVICE]);
  });
  afterEach(() => t.app.close());

  describe('GET /employees/:id/overrides', () => {
    it('lists the Anulaciones grouped by date', async () => {
      t.overrides.listByEmployee.mockResolvedValue([DAY_OFF, HALF_DAY]);

      const res = await t.http
        .get(`/employees/${ANAS_EMPLOYEE.id}/overrides`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([presented(DAY_OFF), presented(HALF_DAY)]);
      expect(t.overrides.listByEmployee).toHaveBeenCalledWith(ANAS_EMPLOYEE.id);
    });

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await t.http
        .get(`/employees/${ANAS_EMPLOYEE.id}/overrides`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.overrides.listByEmployee).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .get('/employees/999/overrides')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get(`/employees/${ANAS_EMPLOYEE.id}/overrides`).expect(401);
    });
  });

  describe('PUT /employees/:id/overrides/:date', () => {
    const put = (body: object, token = CLERK_TOKEN) =>
      t.http
        .put(`/employees/${ANAS_EMPLOYEE.id}/overrides/2026-02-10`)
        .set(bearer(token))
        .send(body);

    beforeEach(() =>
      t.overrides.replace.mockImplementation(
        async (employeeId, date, intervals, coveredByEmployeeId) => ({
          employeeId,
          date,
          intervals,
          coveredByEmployeeId,
        }),
      ),
    );

    it('replaces the date with a día libre when intervals is empty, and answers 200', async () => {
      const res = await put({ intervals: [] }).expect(200);

      expect(t.overrides.replace).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        '2026-02-10',
        [],
        null,
      );
      expect(res.body).toEqual({
        date: '2026-02-10',
        intervals: [],
        coveredByEmployeeId: null,
      });
    });

    it('replaces the date with the given Franjas', async () => {
      const intervals = [{ startTime: '09:00', endTime: '13:00' }];

      await put({ intervals }).expect(200);

      expect(t.overrides.replace).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        '2026-02-10',
        intervals,
        null,
      );
    });

    it('accepts two Franjas that touch', async () => {
      const intervals = [
        { startTime: '09:00', endTime: '13:00' },
        { startTime: '13:00', endTime: '18:00' },
      ];

      await put({ intervals }).expect(200);

      expect(t.overrides.replace).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        '2026-02-10',
        intervals,
        null,
      );
    });

    it.each([
      [
        'two Franjas overlap',
        [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '12:00', endTime: '18:00' },
        ],
        'Dos Franjas del mismo día se solapan',
      ],
      [
        'a Franja ends before it starts',
        [{ startTime: '18:00', endTime: '09:00' }],
        'Cada Franja tiene que terminar después de empezar',
      ],
      [
        'a Franja ends when it starts',
        [{ startTime: '09:00', endTime: '09:00' }],
        'Cada Franja tiene que terminar después de empezar',
      ],
    ])(
      'answers 422 with a message when %s, and replaces nothing',
      async (_, intervals, message) => {
        const res = await put({ intervals }).expect(422);

        expect(res.body.message).toBe(message);
        expect(t.overrides.replace).not.toHaveBeenCalled();
      },
    );

    it('accepts a coveredByEmployeeId of an active Empleado of the same Negocio attending every Servicio', async () => {
      t.services.listActiveByEmployee.mockImplementation(async (employeeId) =>
        employeeId === ANAS_EMPLOYEE.id || employeeId === COVERING_EMPLOYEE.id
          ? [ANAS_SERVICE]
          : [],
      );

      const res = await put({
        intervals: [],
        coveredByEmployeeId: COVERING_EMPLOYEE.id,
      }).expect(200);

      expect(t.overrides.replace).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        '2026-02-10',
        [],
        COVERING_EMPLOYEE.id,
      );
      expect(res.body.coveredByEmployeeId).toBe(COVERING_EMPLOYEE.id);
    });

    it('answers 422 when the cubridor is inactive, and replaces nothing', async () => {
      t.employees.findById.mockImplementation(async (id) =>
        id === COVERING_EMPLOYEE.id
          ? { ...COVERING_EMPLOYEE, retiredAt: new Date() }
          : ANAS_EMPLOYEE,
      );

      const res = await put({
        intervals: [],
        coveredByEmployeeId: COVERING_EMPLOYEE.id,
      }).expect(422);

      expect(res.body.message).toBe(
        'La Cobertura tiene que ser un Empleado activo del mismo Negocio',
      );
      expect(t.overrides.replace).not.toHaveBeenCalled();
    });

    it('answers 422 when the cubridor is of another Negocio, and replaces nothing', async () => {
      t.employees.findById.mockImplementation(async (id) =>
        id === COVERING_EMPLOYEE.id
          ? { ...COVERING_EMPLOYEE, businessId: 999 }
          : ANAS_EMPLOYEE,
      );

      const res = await put({
        intervals: [],
        coveredByEmployeeId: COVERING_EMPLOYEE.id,
      }).expect(422);

      expect(res.body.message).toBe(
        'La Cobertura tiene que ser un Empleado activo del mismo Negocio',
      );
      expect(t.overrides.replace).not.toHaveBeenCalled();
    });

    it('answers 422 when the cubridor does not attend every Servicio of who is absent, and replaces nothing', async () => {
      t.services.listActiveByEmployee.mockImplementation(async (employeeId) =>
        employeeId === ANAS_EMPLOYEE.id
          ? [ANAS_SERVICE, OTHER_SERVICE]
          : [ANAS_SERVICE],
      );

      const res = await put({
        intervals: [],
        coveredByEmployeeId: COVERING_EMPLOYEE.id,
      }).expect(422);

      expect(res.body.message).toBe(
        'La Cobertura tiene que atender todos los Servicios de quien se ausenta',
      );
      expect(t.overrides.replace).not.toHaveBeenCalled();
    });

    it('answers 409 when the cubridor already has a colliding Turno, and changes nothing', async () => {
      t.overrides.replace.mockRejectedValue(
        new ConflictError('El cubridor ya tiene un Turno a esa hora'),
      );

      const res = await put({
        intervals: [],
        coveredByEmployeeId: COVERING_EMPLOYEE.id,
      }).expect(409);

      expect(res.body.message).toBe('El cubridor ya tiene un Turno a esa hora');
    });

    it('rejects an unknown date format with 400, without reaching the repositories', async () => {
      await t.http
        .put(`/employees/${ANAS_EMPLOYEE.id}/overrides/10-02-2026`)
        .set(bearer(CLERK_TOKEN))
        .send({ intervals: [] })
        .expect(400);

      expect(t.overrides.replace).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing intervals', {}],
      ['intervals that are not a list', { intervals: {} }],
      [
        'a Franja with an extra field',
        { intervals: [{ startTime: '09:00', endTime: '10:00', id: 1 }] },
      ],
      [
        'a time not in HH:mm',
        { intervals: [{ startTime: '9:00', endTime: '10:00' }] },
      ],
    ])('rejects %s with 400', async (_, body) => {
      await put(body).expect(400);

      expect(t.overrides.replace).not.toHaveBeenCalled();
    });

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await put({ intervals: [] }, OTHER_CLERK_TOKEN).expect(403);

      expect(t.overrides.replace).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await put({ intervals: [] }).expect(404);
    });
  });

  describe('DELETE /employees/:id/overrides/:date', () => {
    it('removes that date, and answers 204', async () => {
      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}/overrides/2026-02-10`)
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.overrides.delete).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        '2026-02-10',
      );
    });

    it('rejects an unknown date format with 400', async () => {
      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}/overrides/not-a-date`)
        .set(bearer(CLERK_TOKEN))
        .expect(400);

      expect(t.overrides.delete).not.toHaveBeenCalled();
    });

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}/overrides/2026-02-10`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.overrides.delete).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .delete('/employees/999/overrides/2026-02-10')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });
});
