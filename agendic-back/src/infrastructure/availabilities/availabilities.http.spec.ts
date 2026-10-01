import { Availability } from '../../domain/availabilities/availability';
import {
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

const WEEKDAYS = [
  { weekday: 1, startTime: '09:00', endTime: '18:00' },
  { weekday: 2, startTime: '09:00', endTime: '18:00' },
];

const GENERAL: Availability = {
  id: 1,
  employeeId: ANAS_EMPLOYEE.id,
  name: 'Horario general',
  isDefault: true,
  intervals: WEEKDAYS,
};

const AFTERNOON: Availability = {
  id: 2,
  employeeId: ANAS_EMPLOYEE.id,
  name: 'Turno tarde',
  isDefault: false,
  intervals: [{ weekday: 3, startTime: '14:00', endTime: '20:00' }],
};

const presented = (availability: Availability) => ({
  id: availability.id,
  employeeId: availability.employeeId,
  name: availability.name,
  isDefault: availability.isDefault,
  intervals: availability.intervals,
});

describe('Availability', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.availabilities.findById.mockImplementation(
      async (id) => [GENERAL, AFTERNOON].find((a) => a.id === id) ?? null,
    );
  });
  afterEach(() => t.app.close());

  describe('GET /employees/:id/availabilities', () => {
    it('lists the Empleado Availabilities with their Franjas, the default marked', async () => {
      t.availabilities.listByEmployee.mockResolvedValue([GENERAL, AFTERNOON]);

      const res = await t.http
        .get(`/employees/${ANAS_EMPLOYEE.id}/availabilities`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([presented(GENERAL), presented(AFTERNOON)]);
      expect(t.availabilities.listByEmployee).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
      );
    });

    it('lets an Empleado who is not the Dueño read their own', async () => {
      const brunos = { ...ANAS_EMPLOYEE, id: 2, userId: BRUNO.id };
      t.employees.findById.mockResolvedValue(brunos);
      t.availabilities.listByEmployee.mockResolvedValue([]);

      await t.http
        .get(`/employees/${brunos.id}/availabilities`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(200);

      expect(t.availabilities.listByEmployee).toHaveBeenCalledWith(brunos.id);
    });

    it('answers 403 for an Empleado dado de baja reading their own', async () => {
      t.employees.findById.mockResolvedValue({
        ...ANAS_EMPLOYEE,
        id: 2,
        userId: BRUNO.id,
        retiredAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .get('/employees/2/availabilities')
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.availabilities.listByEmployee).not.toHaveBeenCalled();
    });

    it('answers 403 for a Usuario who is neither the Dueño of the Empleado Negocio nor that Empleado', async () => {
      await t.http
        .get(`/employees/${ANAS_EMPLOYEE.id}/availabilities`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.availabilities.listByEmployee).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .get('/employees/999/availabilities')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .get(`/employees/${ANAS_EMPLOYEE.id}/availabilities`)
        .expect(401);
    });
  });

  describe('POST /employees/:id/availabilities', () => {
    const post = (body: object, token = CLERK_TOKEN) =>
      t.http
        .post(`/employees/${ANAS_EMPLOYEE.id}/availabilities`)
        .set(bearer(token))
        .send(body);

    beforeEach(() => {
      t.availabilities.listByEmployee.mockResolvedValue([GENERAL]);
      t.availabilities.create.mockImplementation(async (data) => ({
        id: 3,
        ...data,
      }));
    });

    it("makes the Empleado's first Availability the default, and answers 201", async () => {
      t.availabilities.listByEmployee.mockResolvedValue([]);

      const res = await post({
        name: 'Horario general',
        intervals: WEEKDAYS,
      }).expect(201);

      expect(t.availabilities.create).toHaveBeenCalledWith({
        employeeId: ANAS_EMPLOYEE.id,
        name: 'Horario general',
        isDefault: true,
        intervals: WEEKDAYS,
      });
      expect(res.body).toEqual({
        id: 3,
        employeeId: ANAS_EMPLOYEE.id,
        name: 'Horario general',
        isDefault: true,
        intervals: WEEKDAYS,
      });
    });

    it('does not make a later one the default', async () => {
      const res = await post({ name: 'Turno tarde', intervals: [] }).expect(
        201,
      );

      expect(res.body.isDefault).toBe(false);
    });

    it('accepts two Franjas that touch', async () => {
      const intervals = [
        { weekday: 1, startTime: '09:00', endTime: '17:00' },
        { weekday: 1, startTime: '17:00', endTime: '18:00' },
      ];

      await post({ name: 'Cortado', intervals }).expect(201);

      expect(t.availabilities.create).toHaveBeenCalledWith(
        expect.objectContaining({ intervals }),
      );
    });

    it('accepts two Franjas at the same hours on different days, and days without Franjas', async () => {
      await post({
        name: 'Martes y jueves',
        intervals: [
          { weekday: 2, startTime: '09:00', endTime: '13:00' },
          { weekday: 4, startTime: '09:00', endTime: '13:00' },
        ],
      }).expect(201);
    });

    it.each([
      [
        'two Franjas of the same day overlap',
        [
          { weekday: 1, startTime: '09:00', endTime: '13:00' },
          { weekday: 1, startTime: '12:00', endTime: '18:00' },
        ],
        'Dos Franjas del mismo día se solapan',
      ],
      [
        'a Franja contains another one',
        [
          { weekday: 1, startTime: '14:00', endTime: '15:00' },
          { weekday: 1, startTime: '09:00', endTime: '18:00' },
        ],
        'Dos Franjas del mismo día se solapan',
      ],
      [
        'a Franja ends before it starts',
        [{ weekday: 1, startTime: '18:00', endTime: '09:00' }],
        'Cada Franja tiene que terminar después de empezar',
      ],
      [
        'a Franja ends when it starts',
        [{ weekday: 1, startTime: '09:00', endTime: '09:00' }],
        'Cada Franja tiene que terminar después de empezar',
      ],
    ])(
      'answers 422 with a message when %s, and creates nothing',
      async (_, intervals, message) => {
        const res = await post({ name: 'Mal', intervals }).expect(422);

        expect(res.body.message).toBe(message);
        expect(t.availabilities.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        'a weekday above 6',
        { weekday: 7, startTime: '09:00', endTime: '10:00' },
      ],
      [
        'a negative weekday',
        { weekday: -1, startTime: '09:00', endTime: '10:00' },
      ],
      [
        'a fractional weekday',
        { weekday: 1.5, startTime: '09:00', endTime: '10:00' },
      ],
      [
        'a time not in HH:mm',
        { weekday: 1, startTime: '9:00', endTime: '10:00' },
      ],
      ['a missing endTime', { weekday: 1, startTime: '09:00' }],
      [
        'an extra field',
        { weekday: 1, startTime: '09:00', endTime: '10:00', id: 1 },
      ],
    ])(
      'rejects a Franja with %s with 400, without reaching the repositories',
      async (_, interval) => {
        await post({ name: 'Mal', intervals: [interval] }).expect(400);

        expect(t.availabilities.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['a missing name', { intervals: [] }],
      ['a blank name', { name: '  ', intervals: [] }],
      ['missing intervals', { name: 'Sin franjas' }],
      ['intervals that are not a list', { name: 'Mal', intervals: {} }],
    ])('rejects %s with 400', async (_, body) => {
      await post(body).expect(400);

      expect(t.availabilities.create).not.toHaveBeenCalled();
    });

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await post({ name: 'Horario', intervals: [] }, OTHER_CLERK_TOKEN).expect(
        403,
      );

      expect(t.availabilities.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await post({ name: 'Horario', intervals: [] }).expect(404);
    });
  });

  describe('PATCH /availabilities/:id', () => {
    beforeEach(() =>
      t.availabilities.update.mockImplementation(async (id, data) => {
        const current = id === GENERAL.id ? GENERAL : AFTERNOON;
        return {
          ...current,
          name: data.name ?? current.name,
          intervals: data.intervals ?? current.intervals,
        };
      }),
    );

    it('replaces the whole set of Franjas', async () => {
      const intervals = [{ weekday: 6, startTime: '10:00', endTime: '14:00' }];

      const res = await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ intervals })
        .expect(200);

      expect(t.availabilities.update).toHaveBeenCalledWith(GENERAL.id, {
        intervals,
      });
      expect(res.body).toEqual({ ...presented(GENERAL), intervals });
    });

    it('edits it in place: every Servicio using it sees the change, without touching their link', async () => {
      await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ intervals: [] })
        .expect(200);

      expect(t.availabilities.update).toHaveBeenCalledWith(GENERAL.id, {
        intervals: [],
      });
      expect(t.services.addEmployee).not.toHaveBeenCalled();
      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });

    it('renames it without touching its Franjas', async () => {
      await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Horario de invierno' })
        .expect(200);

      const [, data] = t.availabilities.update.mock.calls[0];
      expect(data).toEqual({ name: 'Horario de invierno' });
      expect(data.intervals).toBeUndefined();
    });

    it('accepts an empty set of Franjas: no day worked', async () => {
      await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ intervals: [] })
        .expect(200);

      expect(t.availabilities.update).toHaveBeenCalledWith(GENERAL.id, {
        intervals: [],
      });
    });

    it('answers 422 for overlapping Franjas, and changes nothing', async () => {
      const res = await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({
          intervals: [
            { weekday: 1, startTime: '09:00', endTime: '13:00' },
            { weekday: 1, startTime: '12:59', endTime: '18:00' },
          ],
        })
        .expect(422);

      expect(res.body.message).toBe('Dos Franjas del mismo día se solapan');
      expect(t.availabilities.update).not.toHaveBeenCalled();
    });

    it('answers 422 for a Franja that ends before it starts, and changes nothing', async () => {
      await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({
          intervals: [{ weekday: 1, startTime: '18:00', endTime: '09:00' }],
        })
        .expect(422);

      expect(t.availabilities.update).not.toHaveBeenCalled();
    });

    it('rejects isDefault with 400: the default changes through its own endpoint', async () => {
      await t.http
        .patch(`/availabilities/${AFTERNOON.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ isDefault: true })
        .expect(400);
    });

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await t.http
        .patch(`/availabilities/${GENERAL.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ name: 'Mío' })
        .expect(403);

      expect(t.availabilities.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Availability', async () => {
      await t.http
        .patch('/availabilities/999')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Nada' })
        .expect(404);
    });
  });

  describe('POST /availabilities/:id/default', () => {
    it('makes it the default, which unmarks the previous one', async () => {
      t.availabilities.makeDefault.mockResolvedValue({
        ...AFTERNOON,
        isDefault: true,
      });

      const res = await t.http
        .post(`/availabilities/${AFTERNOON.id}/default`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.availabilities.makeDefault).toHaveBeenCalledWith(AFTERNOON.id);
      expect(res.body).toEqual({ ...presented(AFTERNOON), isDefault: true });
    });

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await t.http
        .post(`/availabilities/${AFTERNOON.id}/default`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.availabilities.makeDefault).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Availability', async () => {
      await t.http
        .post('/availabilities/999/default')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  describe('DELETE /availabilities/:id', () => {
    beforeEach(() => t.availabilities.countServices.mockResolvedValue(0));

    it('deletes one that is not the default, and answers 204', async () => {
      await t.http
        .delete(`/availabilities/${AFTERNOON.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.availabilities.delete).toHaveBeenCalledWith(AFTERNOON.id);
    });

    it('answers 422 for the default, and deletes nothing', async () => {
      const res = await t.http
        .delete(`/availabilities/${GENERAL.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(res.body.message).toBe(
        'No se puede borrar la Availability predeterminada',
      );
      expect(t.availabilities.delete).not.toHaveBeenCalled();
    });

    it.each([
      [2, 'No se puede borrar la Availability: la usan 2 Servicios'],
      [1, 'No se puede borrar la Availability: la usa 1 Servicio'],
    ])(
      'answers 409 when %i Servicios use it, saying how many, and deletes nothing',
      async (count, message) => {
        t.availabilities.countServices.mockResolvedValue(count);

        const res = await t.http
          .delete(`/availabilities/${AFTERNOON.id}`)
          .set(bearer(CLERK_TOKEN))
          .expect(409);

        expect(res.body.message).toBe(message);
        expect(t.availabilities.countServices).toHaveBeenCalledWith(
          AFTERNOON.id,
        );
        expect(t.availabilities.delete).not.toHaveBeenCalled();
      },
    );

    it('answers 403 for a Usuario who is not the Dueño of the Empleado Negocio', async () => {
      await t.http
        .delete(`/availabilities/${AFTERNOON.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.availabilities.delete).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Availability', async () => {
      await t.http
        .delete('/availabilities/999')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });
});
