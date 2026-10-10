import { Availability, emptySchedule } from '../../domain/availabilities/availability';
import { ConflictError } from '../../domain/errors';
import { ServiceCategory } from '../../domain/services/service';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  bearer,
  BRUNO,
  createTestApp,
  DAY_MS,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const BRANCH = ANAS_BRANCH;

/** A second Empleado of Ana's Negocio: Bruno, who is not its Dueño. */
const OTHER_EMPLOYEE = {
  ...ANAS_EMPLOYEE,
  id: 2,
  userId: BRUNO.id,
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
};

const availability = (
  id: number,
  userId: number,
  isDefault: boolean,
): Availability => ({
  id,
  userId,
  name: isDefault ? 'Horas laborables' : 'Turno tarde',
  timeZone: 'America/Argentina/Buenos_Aires',
  isDefault,
  schedule: emptySchedule(),
  overrides: [],
});

/** Ana's default (10) and another one (11); Bruno's default (20) and another one (21). */
const AVAILABILITIES = [
  availability(10, ANAS_EMPLOYEE.userId, true),
  availability(11, ANAS_EMPLOYEE.userId, false),
  availability(20, OTHER_EMPLOYEE.userId, true),
  availability(21, OTHER_EMPLOYEE.userId, false),
];

const scriptAvailabilities = ({ availabilities }: TestApp) => {
  availabilities.listByUser.mockImplementation(async (userId) =>
    AVAILABILITIES.filter((a) => a.userId === userId),
  );
  availabilities.findById.mockImplementation(
    async (id) => AVAILABILITIES.find((a) => a.id === id) ?? null,
  );
};

/** Answers each Empleado of Ana's Negocio by id. */
const scriptStaff = ({ employees }: TestApp) =>
  employees.findById.mockImplementation(
    async (id) =>
      [ANAS_EMPLOYEE, OTHER_EMPLOYEE].find((e) => e.id === id) ?? null,
  );

const IN_CHARGE = [
  {
    id: ANAS_EMPLOYEE.id,
    name: ANAS_EMPLOYEE.name,
    availabilityId: 10,
    userId: ANAS_EMPLOYEE.userId,
    imageUrl: ANAS_EMPLOYEE.imageUrl,
  },
];

const VALID_SERVICE = {
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 20,
  slug: 'haircut',
  employeeIds: [ANAS_EMPLOYEE.id],
};

const SERVICE = {
  id: 1,
  branchId: BRANCH.id,
  userId: null,
  availabilityId: null,
  name: VALID_SERVICE.name,
  description: VALID_SERVICE.description,
  category: VALID_SERVICE.category,
  durationMinutes: VALID_SERVICE.durationMinutes,
  price: VALID_SERVICE.price,
  depositPercent: null,
  requiresApproval: false,
  deletedAt: null,
  slug: VALID_SERVICE.slug,
  hidden: false,
  prepMinutes: 0,
  dailyLimit: null,
  slotInterval: null,
  minimumNoticeMinutes: 0,
  employees: IN_CHARGE,
};

const PRESENTED_SERVICE = {
  id: SERVICE.id,
  branchId: SERVICE.branchId,
  userId: null,
  availabilityId: null,
  name: SERVICE.name,
  description: SERVICE.description,
  category: SERVICE.category,
  durationMinutes: SERVICE.durationMinutes,
  price: SERVICE.price,
  depositPercent: SERVICE.depositPercent,
  requiresApproval: SERVICE.requiresApproval,
  slug: SERVICE.slug,
  hidden: SERVICE.hidden,
  prepMinutes: SERVICE.prepMinutes,
  dailyLimit: SERVICE.dailyLimit,
  slotInterval: SERVICE.slotInterval,
  minimumNoticeMinutes: SERVICE.minimumNoticeMinutes,
  // The Usuario behind an Empleado is not part of the public API; their foto de perfil is.
  employees: IN_CHARGE.map(({ userId: _, ...employee }) => employee),
};

describe('Servicio', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /branches/:id/services', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.listByIds.mockResolvedValue([ANAS_EMPLOYEE]);
      scriptAvailabilities(t);
    });

    it('creates a Servicio, for the Dueño', async () => {
      t.services.create.mockResolvedValue(SERVICE);

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(201);

      const { employeeIds: _, ...fields } = VALID_SERVICE;
      expect(t.services.create).toHaveBeenCalledWith({
        branchId: BRANCH.id,
        ...fields,
        depositPercent: null,
        requiresApproval: false,
        hidden: false,
        prepMinutes: 0,
        dailyLimit: null,
        slotInterval: null,
        minimumNoticeMinutes: 0,
        employees: [{ employeeId: ANAS_EMPLOYEE.id, availabilityId: 10 }],
      });
      expect(res.body).toEqual(PRESENTED_SERVICE);
    });

    it('creates a Servicio with Tiempo de preparación and Límite diario, and returns them', async () => {
      t.services.create.mockResolvedValue({
        ...SERVICE,
        prepMinutes: 15,
        dailyLimit: 4,
      });

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, prepMinutes: 15, dailyLimit: 4 })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith(
        expect.objectContaining({ prepMinutes: 15, dailyLimit: 4 }),
      );
      expect(res.body).toMatchObject({ prepMinutes: 15, dailyLimit: 4 });
    });

    it.each([0, 5, 10, 15, 30, 60])(
      'accepts a Tiempo de preparación of %i minutes',
      async (prepMinutes) => {
        t.services.create.mockResolvedValue({ ...SERVICE, prepMinutes });

        await t.http
          .post(`/branches/${BRANCH.id}/services`)
          .set(bearer(CLERK_TOKEN))
          .send({ ...VALID_SERVICE, prepMinutes })
          .expect(201);
      },
    );

    it('creates a Servicio with a Seña', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, depositPercent: 30 });

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, depositPercent: 30 })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith(
        expect.objectContaining({ depositPercent: 30 }),
      );
      expect(res.body.depositPercent).toBe(30);
    });

    it('creates a Servicio with Aprobación manual', async () => {
      t.services.create.mockResolvedValue({
        ...SERVICE,
        requiresApproval: true,
      });

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, requiresApproval: true })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith(
        expect.objectContaining({ requiresApproval: true }),
      );
      expect(res.body.requiresApproval).toBe(true);
    });

    it.each([0, 100])('accepts a Seña of %i%%', async (depositPercent) => {
      t.services.create.mockResolvedValue({ ...SERVICE, depositPercent });

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, depositPercent })
        .expect(201);
    });

    it('creates a Servicio without a description', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, description: null });

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, description: undefined })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith({
        branchId: BRANCH.id,
        name: VALID_SERVICE.name,
        description: null,
        category: VALID_SERVICE.category,
        durationMinutes: VALID_SERVICE.durationMinutes,
        price: VALID_SERVICE.price,
        depositPercent: null,
        requiresApproval: false,
        slug: VALID_SERVICE.slug,
        hidden: false,
        prepMinutes: 0,
        dailyLimit: null,
        slotInterval: null,
        minimumNoticeMinutes: 0,
        employees: [{ employeeId: ANAS_EMPLOYEE.id, availabilityId: 10 }],
      });
    });

    it('puts several Empleados in charge, each with their default Availability', async () => {
      t.employees.listByIds.mockResolvedValue([ANAS_EMPLOYEE, OTHER_EMPLOYEE]);
      t.services.create.mockResolvedValue(SERVICE);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({
          ...VALID_SERVICE,
          employeeIds: [ANAS_EMPLOYEE.id, OTHER_EMPLOYEE.id],
        })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employees: [
            { employeeId: ANAS_EMPLOYEE.id, availabilityId: 10 },
            { employeeId: OTHER_EMPLOYEE.id, availabilityId: 20 },
          ],
        }),
      );
    });

    it('answers 422 for an Empleado of another Negocio', async () => {
      t.employees.listByIds.mockResolvedValue([
        { ...ANAS_EMPLOYEE, businessId: ANAS_BUSINESS.id + 1 },
      ]);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(422);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an Empleado dado de baja', async () => {
      t.employees.listByIds.mockResolvedValue([
        { ...ANAS_EMPLOYEE, deletedAt: new Date('2026-01-01T00:00:00.000Z') },
      ]);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(422);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an unknown employeeId', async () => {
      t.employees.listByIds.mockResolvedValue([]);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, employeeIds: [999] })
        .expect(422);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .send(VALID_SERVICE)
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(403);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http
        .post('/branches/999/services')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(404);
    });

    it('answers 409 when the name is already used by an active Servicio in the same Sucursal', async () => {
      t.services.create.mockRejectedValue(
        new ConflictError('Service name already in use'),
      );

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(409);
    });

    it('creates a hidden Servicio with its slug in lowercase', async () => {
      t.services.create.mockResolvedValue({
        ...SERVICE,
        slug: 'corte-de-pelo',
        hidden: true,
      });

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, slug: 'Corte-De-Pelo', hidden: true })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'corte-de-pelo', hidden: true }),
      );
      expect(res.body).toMatchObject({ slug: 'corte-de-pelo', hidden: true });
    });

    it('answers 409 when the slug is already used by an active Servicio in the same Sucursal', async () => {
      t.services.create.mockRejectedValue(
        new ConflictError('Service booking link already in use'),
      );

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(409);

      expect(res.body.message).toBe('Service booking link already in use');
    });

    it.each([
      ['a missing slug', { slug: undefined }],
      ['a malformed slug', { slug: 'corte de pelo!' }],
      ['a non-boolean hidden', { hidden: 'yes' }],
    ])('answers 400 for %s', async (_, patch) => {
      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, ...patch })
        .expect(400);
      expect(t.services.create).not.toHaveBeenCalled();
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a missing name', { name: undefined }],
      ['an invalid category', { category: 'NOT_A_CATEGORY' }],
      ['a missing category', { category: undefined }],
      ['a fractional durationMinutes', { durationMinutes: 1.5 }],
      ['a zero durationMinutes', { durationMinutes: 0 }],
      ['a missing durationMinutes', { durationMinutes: undefined }],
      ['a negative price', { price: -1 }],
      ['a missing price', { price: undefined }],
      ['missing employeeIds', { employeeIds: undefined }],
      ['empty employeeIds', { employeeIds: [] }],
      ['a non-numeric employeeId', { employeeIds: ['one'] }],
      ['a negative depositPercent', { depositPercent: -1 }],
      ['a depositPercent over 100', { depositPercent: 101 }],
      ['a fractional depositPercent', { depositPercent: 12.5 }],
      ['a null depositPercent', { depositPercent: null }],
      ['a non-boolean requiresApproval', { requiresApproval: 'yes' }],
      ['a prepMinutes off the list', { prepMinutes: 20 }],
      ['a negative prepMinutes', { prepMinutes: -5 }],
      ['a zero dailyLimit', { dailyLimit: 0 }],
      ['a fractional dailyLimit', { dailyLimit: 2.5 }],
      ['a null dailyLimit', { dailyLimit: null }],
      ['a zero slotInterval', { slotInterval: 0 }],
      ['a fractional slotInterval', { slotInterval: 7.5 }],
      ['a null slotInterval', { slotInterval: null }],
      ['a negative minimumNoticeMinutes', { minimumNoticeMinutes: -1 }],
      ['a fractional minimumNoticeMinutes', { minimumNoticeMinutes: 1.5 }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, override) => {
        await t.http
          .post(`/branches/${BRANCH.id}/services`)
          .set(bearer(CLERK_TOKEN))
          .send({ ...VALID_SERVICE, ...override })
          .expect(400);

        expect(t.services.create).not.toHaveBeenCalled();
      },
    );

    it('accepts a zero price', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, price: 0 });

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, price: 0 })
        .expect(201);
    });
  });

  describe('PATCH /services/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits a Servicio, for the Dueño', async () => {
      t.services.update.mockResolvedValue({ ...SERVICE, price: 25 });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ price: 25 })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        price: 25,
      });
      expect(res.body.price).toBe(25);
    });

    it('turns on Aprobación manual', async () => {
      t.services.update.mockResolvedValue({
        ...SERVICE,
        requiresApproval: true,
      });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ requiresApproval: true })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        requiresApproval: true,
      });
      expect(res.body.requiresApproval).toBe(true);
    });

    it('sets the Seña', async () => {
      t.services.update.mockResolvedValue({ ...SERVICE, depositPercent: 50 });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ depositPercent: 50 })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        depositPercent: 50,
      });
      expect(res.body.depositPercent).toBe(50);
    });

    it('changes the Tiempo de preparación and the Límite diario', async () => {
      t.services.update.mockResolvedValue({
        ...SERVICE,
        prepMinutes: 30,
        dailyLimit: 6,
      });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ prepMinutes: 30, dailyLimit: 6 })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        prepMinutes: 30,
        dailyLimit: 6,
      });
      expect(res.body).toMatchObject({ prepMinutes: 30, dailyLimit: 6 });
    });

    it('saves the Intervalo and the Anticipación mínima, and a null slotInterval drops the Intervalo', async () => {
      t.services.update.mockResolvedValue({
        ...SERVICE,
        slotInterval: 45,
        minimumNoticeMinutes: 120,
      });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ slotInterval: 45, minimumNoticeMinutes: 120 })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        slotInterval: 45,
        minimumNoticeMinutes: 120,
      });
      expect(res.body).toMatchObject({ slotInterval: 45, minimumNoticeMinutes: 120 });

      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ slotInterval: null })
        .expect(200);
      expect(t.services.update).toHaveBeenLastCalledWith(SERVICE.id, {
        slotInterval: null,
      });
    });

    it('drops the Límite diario with a null dailyLimit', async () => {
      t.services.update.mockResolvedValue(SERVICE);

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ dailyLimit: null })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        dailyLimit: null,
      });
      expect(res.body.dailyLimit).toBeNull();
    });

    it('drops the Seña with a null depositPercent', async () => {
      t.services.update.mockResolvedValue(SERVICE);

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ depositPercent: null })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        depositPercent: null,
      });
      expect(res.body.depositPercent).toBeNull();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(`/services/${SERVICE.id}`)
        .send({ price: 25 })
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ price: 25 })
        .expect(403);

      expect(t.services.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .patch('/services/999')
        .set(bearer(CLERK_TOKEN))
        .send({ price: 25 })
        .expect(404);
    });

    it('changes the slug and hides the Servicio', async () => {
      t.services.update.mockResolvedValue({
        ...SERVICE,
        slug: 'nuevo',
        hidden: true,
      });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ slug: 'Nuevo', hidden: true })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        slug: 'nuevo',
        hidden: true,
      });
      expect(res.body).toMatchObject({ slug: 'nuevo', hidden: true });
    });

    it('answers 409 on a slug already in use in the Sucursal', async () => {
      t.services.update.mockRejectedValue(
        new ConflictError('Service booking link already in use'),
      );

      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ slug: 'taken' })
        .expect(409);
    });

    it('answers 409 on a rename to a taken name', async () => {
      t.services.update.mockRejectedValue(
        new ConflictError('Service name already in use'),
      );

      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Taken' })
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['an invalid category', { category: 'NOT_A_CATEGORY' }],
      ['a zero durationMinutes', { durationMinutes: 0 }],
      ['a negative price', { price: -1 }],
      ['a negative depositPercent', { depositPercent: -1 }],
      ['a depositPercent over 100', { depositPercent: 101 }],
      ['a fractional depositPercent', { depositPercent: 12.5 }],
      ['a prepMinutes off the list', { prepMinutes: 45 }],
      ['a null prepMinutes', { prepMinutes: null }],
      ['a zero dailyLimit', { dailyLimit: 0 }],
      ['a zero slotInterval', { slotInterval: 0 }],
      ['a negative minimumNoticeMinutes', { minimumNoticeMinutes: -1 }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, body) => {
        await t.http
          .patch(`/services/${SERVICE.id}`)
          .set(bearer(CLERK_TOKEN))
          .send(body)
          .expect(400);

        expect(t.services.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('DELETE /services/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.retire.mockResolvedValue({
        service: { ...SERVICE, deletedAt: new Date() },
        cancelledBookings: 0,
      });
    });

    it('gives the Servicio de baja, for the Dueño', async () => {
      const res = await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.retire).toHaveBeenCalledWith(
        SERVICE.id,
        expect.any(Date),
      );
      expect(res.body).toEqual({ id: SERVICE.id, cancelledBookings: 0 });
    });

    it("uses the Clock's current now as the cascade's cutoff, moving as the Clock advances", async () => {
      t.clock.advance(2 * DAY_MS);

      await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.retire).toHaveBeenCalledWith(SERVICE.id, t.clock.now());
    });

    it('reports how many future Turnos it cancelled', async () => {
      t.services.retire.mockResolvedValue({
        service: { ...SERVICE, deletedAt: new Date() },
        cancelledBookings: 3,
      });

      const res = await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ id: SERVICE.id, cancelledBookings: 3 });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/services/${SERVICE.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.services.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http.delete('/services/999').set(bearer(CLERK_TOKEN)).expect(404);
    });
  });

  describe('POST /services/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.findById.mockResolvedValue(OTHER_EMPLOYEE);
      scriptAvailabilities(t);
    });

    it('puts the Empleado in charge of the Servicio with their default Availability, for the Dueño', async () => {
      t.services.addEmployee.mockResolvedValue({
        ...SERVICE,
        employees: [
          ...IN_CHARGE,
          {
            id: OTHER_EMPLOYEE.id,
            name: OTHER_EMPLOYEE.name,
            availabilityId: 20,
            userId: OTHER_EMPLOYEE.userId,
            imageUrl: OTHER_EMPLOYEE.imageUrl,
          },
        ],
      });

      const res = await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(200);

      expect(t.services.addEmployee).toHaveBeenCalledWith({
        serviceId: SERVICE.id,
        employeeId: OTHER_EMPLOYEE.id,
        availabilityId: 20,
      });
      expect(res.body.employees).toContainEqual({
        id: OTHER_EMPLOYEE.id,
        name: OTHER_EMPLOYEE.name,
        availabilityId: 20,
        imageUrl: OTHER_EMPLOYEE.imageUrl,
      });
    });

    it('puts the Empleado in charge with the Availability of theirs it names', async () => {
      t.services.addEmployee.mockResolvedValue(SERVICE);

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id, availabilityId: 21 })
        .expect(200);

      expect(t.services.addEmployee).toHaveBeenCalledWith({
        serviceId: SERVICE.id,
        employeeId: OTHER_EMPLOYEE.id,
        availabilityId: 21,
      });
    });

    it("answers 422 for another Usuario's Availability, and links nothing", async () => {
      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id, availabilityId: 11 })
        .expect(422);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Availability', async () => {
      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id, availabilityId: 999 })
        .expect(404);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric availabilityId with 400', async () => {
      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id, availabilityId: 'tarde' })
        .expect(400);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 409 when the Empleado is already in charge', async () => {
      t.services.addEmployee.mockRejectedValue(
        new ConflictError('Employee already in charge of this Service'),
      );

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(409);
    });

    it('answers 422 for an Empleado of another Negocio', async () => {
      t.employees.findById.mockResolvedValue({
        ...OTHER_EMPLOYEE,
        businessId: ANAS_BUSINESS.id + 1,
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(422);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 422 for a Servicio dado de baja, and links nothing', async () => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(422);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 422 for an Empleado dado de baja', async () => {
      t.employees.findById.mockResolvedValue({
        ...OTHER_EMPLOYEE,
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(422);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(401);
    });

    it('lets an Empleado who is not the Dueño Ofrecer it themself, with their default Availability', async () => {
      scriptStaff(t);
      t.services.addEmployee.mockResolvedValue(SERVICE);

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(200);

      expect(t.services.addEmployee).toHaveBeenCalledWith({
        serviceId: SERVICE.id,
        employeeId: OTHER_EMPLOYEE.id,
        availabilityId: 20,
      });
    });

    it('answers 403 when an Empleado puts another Empleado in charge', async () => {
      scriptStaff(t);

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ employeeId: ANAS_EMPLOYEE.id })
        .expect(403);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 403 for a Usuario who is not an active Empleado of the Servicio Negocio', async () => {
      t.employees.findById.mockResolvedValue({
        ...OTHER_EMPLOYEE,
        businessId: ANAS_BUSINESS.id + 1,
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(403);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 403 for an Empleado dado de baja acting on themself', async () => {
      t.employees.findById.mockResolvedValue({
        ...OTHER_EMPLOYEE,
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(403);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it("answers 404 when an Empleado Ofrece a Servicio oculto they don't attend", async () => {
      scriptStaff(t);
      t.services.findById.mockResolvedValue({ ...SERVICE, hidden: true });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(404);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('lets the Dueño Ofrecer a Servicio oculto to any Empleado', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, hidden: true });
      t.services.addEmployee.mockResolvedValue(SERVICE);

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(200);

      expect(t.services.addEmployee).toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .post('/services/999/employees')
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(404);
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: 999 })
        .expect(404);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /services/:id/employees/:employeeId', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.findById.mockResolvedValue(OTHER_EMPLOYEE);
      t.services.removeEmployee.mockResolvedValue({
        service: SERVICE,
        cancelledBookings: 0,
      });
    });

    it('takes the Empleado off the Servicio, for the Dueño', async () => {
      const res = await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.removeEmployee).toHaveBeenCalledWith(
        SERVICE.id,
        OTHER_EMPLOYEE.id,
        expect.any(Date),
      );
      expect(res.body).toEqual({ cancelledBookings: 0 });
    });

    it('reports how many future Turnos of that Empleado it cancelled', async () => {
      t.services.removeEmployee.mockResolvedValue({
        service: SERVICE,
        cancelledBookings: 2,
      });

      const res = await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 2 });
    });

    it("answers 422 and changes nothing when they're the Servicio's last Empleado", async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);

      await t.http
        .delete(`/services/${SERVICE.id}/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });

    it('removes the last Empleado when the Servicio is already dado de baja', async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .delete(`/services/${SERVICE.id}/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.removeEmployee).toHaveBeenCalledWith(
        SERVICE.id,
        ANAS_EMPLOYEE.id,
        expect.any(Date),
      );
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .expect(401);
    });

    it('lets an Empleado stop offering it themself', async () => {
      scriptStaff(t);
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        employees: [
          ...IN_CHARGE,
          {
            id: OTHER_EMPLOYEE.id,
            name: OTHER_EMPLOYEE.name,
            availabilityId: 20,
            userId: OTHER_EMPLOYEE.userId,
            imageUrl: OTHER_EMPLOYEE.imageUrl,
          },
        ],
      });

      const res = await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(200);

      expect(t.services.removeEmployee).toHaveBeenCalledWith(
        SERVICE.id,
        OTHER_EMPLOYEE.id,
        expect.any(Date),
      );
      expect(res.body).toEqual({ cancelledBookings: 0 });
    });

    it("answers 422 when the Empleado taking themself off is the Servicio's last", async () => {
      scriptStaff(t);
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        employees: [
          {
            id: OTHER_EMPLOYEE.id,
            name: OTHER_EMPLOYEE.name,
            availabilityId: 20,
            userId: OTHER_EMPLOYEE.userId,
            imageUrl: OTHER_EMPLOYEE.imageUrl,
          },
        ],
      });

      await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(422);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });

    it('answers 403 when an Empleado takes another Empleado off', async () => {
      scriptStaff(t);

      await t.http
        .delete(`/services/${SERVICE.id}/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .delete(`/services/999/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .delete(`/services/${SERVICE.id}/employees/999`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /services/:id/employees/:employeeId', () => {
    const path = (employeeId: number) =>
      `/services/${SERVICE.id}/employees/${employeeId}`;

    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      scriptStaff(t);
      scriptAvailabilities(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.findEmployeeLink.mockImplementation(
        async (serviceId, employeeId) => ({
          serviceId,
          employeeId,
          availabilityId: employeeId === OTHER_EMPLOYEE.id ? 20 : 10,
        }),
      );
      t.services.setEmployeeAvailability.mockResolvedValue({
        ...SERVICE,
        employees: [
          ...IN_CHARGE,
          {
            id: OTHER_EMPLOYEE.id,
            name: OTHER_EMPLOYEE.name,
            availabilityId: 21,
            userId: OTHER_EMPLOYEE.userId,
            imageUrl: OTHER_EMPLOYEE.imageUrl,
          },
        ],
      });
    });

    it('changes the Availability an Empleado attends it with, for the Dueño, without touching Turnos', async () => {
      const res = await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 21 })
        .expect(200);

      expect(t.services.setEmployeeAvailability).toHaveBeenCalledWith({
        serviceId: SERVICE.id,
        employeeId: OTHER_EMPLOYEE.id,
        availabilityId: 21,
      });
      expect(res.body.employees).toContainEqual({
        id: OTHER_EMPLOYEE.id,
        name: OTHER_EMPLOYEE.name,
        availabilityId: 21,
        imageUrl: OTHER_EMPLOYEE.imageUrl,
      });
      for (const method of Object.values(t.bookings))
        expect(method).not.toHaveBeenCalled();
    });

    it('lets the Empleado change their own', async () => {
      await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ availabilityId: 21 })
        .expect(200);

      expect(t.services.setEmployeeAvailability).toHaveBeenCalled();
    });

    it("answers 422 for another Usuario's Availability, and changes nothing", async () => {
      const res = await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 11 })
        .expect(422);

      expect(res.body.message).toBe(
        'La Availability tiene que ser del mismo Usuario que el Empleado',
      );
      expect(t.services.setEmployeeAvailability).not.toHaveBeenCalled();
    });

    it("answers 404 when that Empleado doesn't attend the Servicio", async () => {
      t.services.findEmployeeLink.mockResolvedValue(null);

      await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 21 })
        .expect(404);

      expect(t.services.setEmployeeAvailability).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Availability', async () => {
      await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 999 })
        .expect(404);

      expect(t.services.setEmployeeAvailability).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 21 })
        .expect(404);
    });

    it("answers 403 when an Empleado changes another Empleado's", async () => {
      await t.http
        .patch(path(ANAS_EMPLOYEE.id))
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ availabilityId: 11 })
        .expect(403);

      expect(t.services.setEmployeeAvailability).not.toHaveBeenCalled();
    });

    it('rejects a missing or non-numeric availabilityId with 400', async () => {
      for (const body of [{}, { availabilityId: 'tarde' }])
        await t.http
          .patch(path(OTHER_EMPLOYEE.id))
          .set(bearer(CLERK_TOKEN))
          .send(body)
          .expect(400);

      expect(t.services.setEmployeeAvailability).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(path(OTHER_EMPLOYEE.id))
        .send({ availabilityId: 21 })
        .expect(401);
    });
  });

  describe('GET /branches/:id/services', () => {
    it("lists a Sucursal's active Servicios, and who attends each, without a Sesión", async () => {
      t.branches.findById.mockResolvedValue(BRANCH);
      t.services.listActiveByBranch.mockResolvedValue([SERVICE]);

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services`)
        .expect(200);

      expect(res.body).toEqual([PRESENTED_SERVICE]);
      expect(JSON.stringify(res.body)).not.toContain(ANAS_EMPLOYEE.email);
    });

    it("shows each Empleado's foto de perfil, or null without one, and nothing else of the Usuario", async () => {
      t.branches.findById.mockResolvedValue(BRANCH);
      t.services.listActiveByBranch.mockResolvedValue([
        {
          ...SERVICE,
          employees: [
            { ...IN_CHARGE[0], imageUrl: 'https://img.clerk.com/ana.png' },
            { ...IN_CHARGE[0], id: 2, imageUrl: null },
          ],
        },
      ]);

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services`)
        .expect(200);

      expect(res.body[0].employees).toEqual([
        {
          id: IN_CHARGE[0].id,
          name: IN_CHARGE[0].name,
          availabilityId: 10,
          imageUrl: 'https://img.clerk.com/ana.png',
        },
        {
          id: 2,
          name: IN_CHARGE[0].name,
          availabilityId: 10,
          imageUrl: null,
        },
      ]);
    });

    it('leaves out the Servicios ocultos', async () => {
      t.branches.findById.mockResolvedValue(BRANCH);
      t.services.listActiveByBranch.mockResolvedValue([
        SERVICE,
        { ...SERVICE, id: 2, slug: 'oculto', hidden: true },
      ]);

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services`)
        .expect(200);

      expect(res.body).toEqual([PRESENTED_SERVICE]);
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http.get('/branches/999/services').expect(404);
    });
  });

  describe('GET /branches/:id/services/by-slug/:slug', () => {
    beforeEach(() => t.branches.findById.mockResolvedValue(BRANCH));

    it('answers a visible Servicio by its tramo, without a Sesión', async () => {
      t.services.findActiveBySlug.mockResolvedValue(SERVICE);

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services/by-slug/${SERVICE.slug}`)
        .expect(200);

      expect(res.body).toEqual(PRESENTED_SERVICE);
      expect(t.services.findActiveBySlug).toHaveBeenCalledWith(
        BRANCH.id,
        SERVICE.slug,
      );
    });

    it('answers a Servicio oculto too: its tramo is the way in', async () => {
      t.services.findActiveBySlug.mockResolvedValue({
        ...SERVICE,
        hidden: true,
      });

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services/by-slug/${SERVICE.slug}`)
        .expect(200);

      expect(res.body).toEqual({ ...PRESENTED_SERVICE, hidden: true });
    });

    it('compares the tramo in lowercase', async () => {
      t.services.findActiveBySlug.mockResolvedValue(SERVICE);

      await t.http
        .get(`/branches/${BRANCH.id}/services/by-slug/HairCut`)
        .expect(200);

      expect(t.services.findActiveBySlug).toHaveBeenCalledWith(
        BRANCH.id,
        'haircut',
      );
    });

    it('answers 404 for a tramo that no active Servicio of that Sucursal has: unknown, dado de baja or of another Sucursal', async () => {
      t.services.findActiveBySlug.mockResolvedValue(null);

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services/by-slug/${SERVICE.slug}`)
        .expect(404);

      expect(res.body.message).toBe('Service not found');
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http
        .get(`/branches/999/services/by-slug/${SERVICE.slug}`)
        .expect(404);
      expect(t.services.findActiveBySlug).not.toHaveBeenCalled();
    });
  });

  describe('GET /employees/me/services', () => {
    const BRUNOS_BUSINESS = {
      ...ANAS_BUSINESS,
      id: 2,
      ownerId: 2,
      slug: 'brunos',
    };
    const BRANCH_B = { ...ANAS_BRANCH, id: 3, businessId: 2, slug: 'b-sur' };
    const BRANCH_A = { ...ANAS_BRANCH, id: 4, businessId: 2, slug: 'a-norte' };
    const ANAS_SEAT_AT_BRUNOS = { ...ANAS_EMPLOYEE, id: 5, businessId: 2 };
    const brunosService = (
      id: number,
      hidden: boolean,
      attendedBy: number[],
    ) => ({
      ...SERVICE,
      id,
      branchId: BRANCH_B.id,
      slug: `s${id}`,
      hidden,
      employees: attendedBy.map((employeeId) => ({
        id: employeeId,
        name: 'x',
        availabilityId: 99,
        userId: employeeId,
        imageUrl: null,
      })),
    });
    const ids = (services: { id: number }[]) => services.map(({ id }) => id);

    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockImplementation(
        async (id) =>
          [ANAS_BUSINESS, BRUNOS_BUSINESS].find((b) => b.id === id) ?? null,
      );
      t.branches.listByBusiness.mockImplementation(async (id) =>
        id === ANAS_BUSINESS.id ? [ANAS_BRANCH] : [BRANCH_B, BRANCH_A],
      );
    });

    it("shows the Logo of each Negocio in its group's business", async () => {
      t.employees.listActiveByUser.mockResolvedValue([ANAS_EMPLOYEE]);
      t.businesses.findById.mockResolvedValue({
        ...ANAS_BUSINESS,
        logoUrl: 'https://files.example.com/logo',
      });
      t.services.listActiveByBranch.mockResolvedValue([]);

      const res = await t.http
        .get('/employees/me/services')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body[0].business).toEqual({
        id: ANAS_BUSINESS.id,
        name: ANAS_BUSINESS.name,
        slug: ANAS_BUSINESS.slug,
        logoUrl: 'https://files.example.com/logo',
      });
    });

    it('leaves out the Negocio dado de baja that an Empleado still has a seat in', async () => {
      t.employees.listActiveByUser.mockResolvedValue([
        ANAS_EMPLOYEE,
        ANAS_SEAT_AT_BRUNOS,
      ]);
      t.businesses.findById.mockImplementation(async (id) =>
        id === ANAS_BUSINESS.id ? ANAS_BUSINESS : null,
      );
      t.services.listActiveByBranch.mockResolvedValue([]);

      const res = await t.http
        .get('/employees/me/services')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].business.id).toBe(ANAS_BUSINESS.id);
    });

    it('answers a group per Negocio, as Dueño of one and Empleado of another, branches by slug, hidden Servicios only when allowed', async () => {
      t.employees.listActiveByUser.mockResolvedValue([
        ANAS_EMPLOYEE,
        ANAS_SEAT_AT_BRUNOS,
      ]);
      const hiddenOfMine = {
        ...SERVICE,
        id: 8,
        slug: 'mine',
        hidden: true,
        employees: [],
      };
      t.services.listActiveByBranch.mockImplementation(async (branchId) => {
        if (branchId === ANAS_BRANCH.id) return [hiddenOfMine];
        if (branchId === BRANCH_B.id)
          return [
            brunosService(10, false, [9]),
            brunosService(11, true, [9]),
            brunosService(12, true, [ANAS_SEAT_AT_BRUNOS.id]),
          ];
        return [];
      });

      const res = await t.http
        .get('/employees/me/services')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        business: {
          id: ANAS_BUSINESS.id,
          name: ANAS_BUSINESS.name,
          slug: ANAS_BUSINESS.slug,
        },
        role: 'owner',
        employeeId: ANAS_EMPLOYEE.id,
      });
      expect(ids(res.body[0].branches[0].services)).toEqual([8]);
      expect(res.body[1]).toMatchObject({
        role: 'employee',
        employeeId: ANAS_SEAT_AT_BRUNOS.id,
      });
      expect(res.body[1].branches.map((b: { slug: string }) => b.slug)).toEqual(
        ['a-norte', 'b-sur'],
      );
      expect(res.body[1].branches[0].services).toEqual([]);
      expect(ids(res.body[1].branches[1].services)).toEqual([10, 12]);
    });

    it('answers [] for a Usuario who is not Empleado of anything', async () => {
      t.employees.listActiveByUser.mockResolvedValue([]);

      const res = await t.http
        .get('/employees/me/services')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/employees/me/services').expect(401);
    });
  });
});
