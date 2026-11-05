import { BranchChangeBooking } from '../../domain/employees/employees.repository';
import {
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

const SECOND_BRANCH = { ...ANAS_BRANCH, id: 2, name: 'Uptown' };
const THIRD_BRANCH = { ...ANAS_BRANCH, id: 3, name: 'Midtown' };
const BRUNOS_EMPLOYEE = {
  ...ANAS_EMPLOYEE,
  id: 2,
  userId: BRUNO.id,
  name: BRUNO.name,
  email: BRUNO.email,
  branchIds: [ANAS_BRANCH.id, SECOND_BRANCH.id],
};

const booking = (
  id: number,
  overrides: Partial<BranchChangeBooking> = {},
): BranchChangeBooking => ({
  id,
  startsAt: new Date(`2026-02-0${id}T13:00:00.000Z`),
  endsAt: new Date(`2026-02-0${id}T14:00:00.000Z`),
  timeZone: SECOND_BRANCH.timeZone,
  serviceName: 'Corte',
  clientName: `Cliente ${id}`,
  clientEmail: `cliente${id}@example.com`,
  link: `link-${id}`,
  seriesId: null,
  branch: { id: SECOND_BRANCH.id, name: SECOND_BRANCH.name },
  ...overrides,
});

describe('Cambiar las Sucursales de un Empleado', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.employees.findById.mockResolvedValue(BRUNOS_EMPLOYEE);
    t.branches.listByBusiness.mockResolvedValue([
      ANAS_BRANCH,
      SECOND_BRANCH,
      THIRD_BRANCH,
    ]);
    t.services.listActiveByEmployee.mockResolvedValue([]);
    t.employees.listUpcomingInBranches.mockResolvedValue([]);
    t.employees.changeBranches.mockImplementation(
      async (_id, branchIds, cancelBookingIds) => ({
        employee: { ...BRUNOS_EMPLOYEE, branchIds },
        cancelledIds: cancelBookingIds,
      }),
    );
  });
  afterEach(() => t.app.close());

  const preview = (branchIds: unknown, employeeId = BRUNOS_EMPLOYEE.id) =>
    t.http
      .post(`/employees/${employeeId}/branches/preview`)
      .set(bearer(CLERK_TOKEN))
      .send({ branchIds });
  const put = (
    branchIds: unknown,
    cancelBookingIds?: unknown,
    employeeId = BRUNOS_EMPLOYEE.id,
  ) =>
    t.http
      .put(`/employees/${employeeId}/branches`)
      .set(bearer(CLERK_TOKEN))
      .send(cancelBookingIds === undefined ? { branchIds } : { branchIds, cancelBookingIds });

  describe('POST /employees/:id/branches/preview', () => {
    it('lists the future Turnos on the Sucursales the Empleado loses, and writes nothing', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1), booking(2)]);

      const res = await preview([ANAS_BRANCH.id]).expect(200);

      expect(t.employees.listUpcomingInBranches).toHaveBeenCalledWith(
        BRUNOS_EMPLOYEE.id,
        [SECOND_BRANCH.id],
        new Date('2026-01-01T12:00:00.000Z'),
      );
      expect(res.body).toEqual([
        {
          id: 1,
          startsAt: '2026-02-01T13:00:00.000Z',
          endsAt: '2026-02-01T14:00:00.000Z',
          timeZone: SECOND_BRANCH.timeZone,
          serviceName: 'Corte',
          clientName: 'Cliente 1',
          branch: { id: SECOND_BRANCH.id, name: SECOND_BRANCH.name },
        },
        expect.objectContaining({ id: 2 }),
      ]);
      expect(t.employees.changeBranches).not.toHaveBeenCalled();
    });

    it('is empty, without asking for Turnos, when no Sucursal is lost', async () => {
      const res = await preview([ANAS_BRANCH.id, SECOND_BRANCH.id, THIRD_BRANCH.id]).expect(200);

      expect(res.body).toEqual([]);
      expect(t.employees.listUpcomingInBranches).not.toHaveBeenCalled();
    });
  });

  describe('PUT /employees/:id/branches', () => {
    it('adds a Sucursal without cancelling anything', async () => {
      const res = await put([ANAS_BRANCH.id, SECOND_BRANCH.id, THIRD_BRANCH.id]).expect(200);

      expect(t.employees.changeBranches).toHaveBeenCalledWith(
        BRUNOS_EMPLOYEE.id,
        [ANAS_BRANCH.id, SECOND_BRANCH.id, THIRD_BRANCH.id],
        [],
        new Date('2026-01-01T12:00:00.000Z'),
      );
      expect(res.body).toEqual({
        id: BRUNOS_EMPLOYEE.id,
        userId: BRUNO.id,
        name: BRUNO.name,
        email: BRUNO.email,
        imageUrl: null,
        branchIds: [ANAS_BRANCH.id, SECOND_BRANCH.id, THIRD_BRANCH.id],
        cancelledBookings: 0,
      });
      expect(t.mailer.sendBookingCancellation).not.toHaveBeenCalled();
    });

    it('cancels the Turnos the Dueño saw, and sends each Cliente the Aviso de cambio del Turno', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1), booking(2)]);

      const res = await put([ANAS_BRANCH.id], [1, 2]).expect(200);

      expect(t.employees.changeBranches).toHaveBeenCalledWith(
        BRUNOS_EMPLOYEE.id,
        [ANAS_BRANCH.id],
        [1, 2],
        new Date('2026-01-01T12:00:00.000Z'),
      );
      expect(res.body.cancelledBookings).toBe(2);
      expect(res.body.branchIds).toEqual([ANAS_BRANCH.id]);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledTimes(2);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith('cliente1@example.com', 'link-1', null, undefined);
    });

    it('sends one Aviso per Serie, with all its cancelled dates', async () => {
      const serie = '11111111-1111-4111-8111-111111111111';
      t.employees.listUpcomingInBranches.mockResolvedValue([
        booking(1, { seriesId: serie, clientEmail: 'serie@example.com' }),
        booking(2, { seriesId: serie, clientEmail: 'serie@example.com' }),
        booking(3),
      ]);

      await put([ANAS_BRANCH.id], [1, 2, 3]).expect(200);

      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledTimes(2);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        'serie@example.com',
        'link-1',
        null,
        {
          bookings: [
            { startsAt: new Date('2026-02-01T13:00:00.000Z'), link: 'link-1' },
            { startsAt: new Date('2026-02-02T13:00:00.000Z'), link: 'link-2' },
          ],
          timeZone: SECOND_BRANCH.timeZone,
        },
      );
    });

    it('keeps the change and answers 200 when an Aviso mail fails', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1)]);
      t.mailer.sendBookingCancellation.mockRejectedValue(new Error('SMTP down'));

      const res = await put([ANAS_BRANCH.id], [1]).expect(200);

      expect(res.body.cancelledBookings).toBe(1);
    });

    it('answers 409 and writes nothing when a Turno that would be cancelled was not confirmed', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1), booking(2)]);

      const res = await put([ANAS_BRANCH.id], [1]).expect(409);

      expect(res.body.message).toBe('Los Turnos que se cancelan cambiaron');
      expect(t.employees.changeBranches).not.toHaveBeenCalled();
    });

    it('answers 409 when nothing was confirmed and a Turno would be cancelled', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1)]);

      await put([ANAS_BRANCH.id]).expect(409);
    });

    it('ignores confirmed ids that are no longer cancelled', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1)]);

      await put([ANAS_BRANCH.id], [1, 99]).expect(200);

      expect(t.employees.changeBranches).toHaveBeenCalledWith(
        BRUNOS_EMPLOYEE.id,
        [ANAS_BRANCH.id],
        [1],
        expect.any(Date),
      );
    });

    it('only mails the Turnos the repository really cancelled', async () => {
      t.employees.listUpcomingInBranches.mockResolvedValue([booking(1), booking(2)]);
      t.employees.changeBranches.mockResolvedValue({
        employee: { ...BRUNOS_EMPLOYEE, branchIds: [ANAS_BRANCH.id] },
        cancelledIds: [2],
      });

      const res = await put([ANAS_BRANCH.id], [1, 2]).expect(200);

      expect(res.body.cancelledBookings).toBe(1);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledTimes(1);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith('cliente2@example.com', 'link-2', null, undefined);
    });
  });

  describe.each([
    ['POST /employees/:id/branches/preview', preview],
    ['PUT /employees/:id/branches', (ids: unknown) => put(ids)],
  ])('errors of %s', (_, call) => {
    const nothingWritten = () => {
      expect(t.employees.changeBranches).not.toHaveBeenCalled();
      expect(t.employees.listUpcomingInBranches).not.toHaveBeenCalled();
    };

    it('answers 401 without a Sesión', async () => {
      await t.http.post('/employees/2/branches/preview').send({ branchIds: [1] }).expect(401);
    });

    it('answers 403 when the caller is not the Dueño of the Negocio', async () => {
      await t.http
        [_.startsWith('POST') ? 'post' : 'put'](
          _.startsWith('POST') ? '/employees/2/branches/preview' : '/employees/2/branches',
        )
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ branchIds: [1] })
        .expect(403);
      nothingWritten();
    });

    it('answers 404 when the Empleado does not exist', async () => {
      t.employees.findById.mockResolvedValue(null);

      await call([ANAS_BRANCH.id]).expect(404);
      nothingWritten();
    });

    it('answers 404 when the Empleado is dado de baja', async () => {
      t.employees.findById.mockResolvedValue({ ...BRUNOS_EMPLOYEE, deletedAt: new Date() });

      await call([ANAS_BRANCH.id]).expect(404);
      nothingWritten();
    });

    it.each([
      ['not an array', 1],
      ['not integers', ['1']],
    ])('answers 400 when branchIds are %s', async (__, branchIds) => {
      await call(branchIds).expect(400);
      nothingWritten();
    });

    it('answers 400 when branchIds is empty', async () => {
      const res = await call([]).expect(400);

      expect(res.body.message).toBe('branchIds must have at least one Branch');
      nothingWritten();
    });

    it('answers 422 naming the Sucursal that is not of the Negocio', async () => {
      const res = await call([ANAS_BRANCH.id, 99]).expect(422);

      expect(res.body.message).toBe(`Branch 99 is not a Branch of Business ${ANAS_BUSINESS.id}`);
      nothingWritten();
    });

    it('answers 422 when the Dueño would lose a Sucursal', async () => {
      t.employees.findById.mockResolvedValue({
        ...ANAS_EMPLOYEE,
        branchIds: [ANAS_BRANCH.id, SECOND_BRANCH.id, THIRD_BRANCH.id],
      });

      const res = await call([ANAS_BRANCH.id]).expect(422);

      expect(res.body.message).toBe('The Dueño works at every Branch');
      nothingWritten();
    });

    it('answers 422 naming the first Servicio left without Empleados', async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        { ...ANAS_SERVICE, id: 7, branchId: ANAS_BRANCH.id, employees: [{ ...ANAS_SERVICE.employees[0], id: BRUNOS_EMPLOYEE.id }] },
        { ...ANAS_SERVICE, id: 8, branchId: SECOND_BRANCH.id, employees: [{ ...ANAS_SERVICE.employees[0], id: BRUNOS_EMPLOYEE.id }] },
        { ...ANAS_SERVICE, id: 9, branchId: SECOND_BRANCH.id, employees: [{ ...ANAS_SERVICE.employees[0], id: BRUNOS_EMPLOYEE.id }] },
      ]);

      const res = await call([ANAS_BRANCH.id]).expect(422);

      expect(res.body.message).toBe(`Employee ${BRUNOS_EMPLOYEE.id} is the last Employee of Service 8`);
      nothingWritten();
    });

    it('lets the Dueño keep every Sucursal even when the Negocio has one their Empleado lacks', async () => {
      t.employees.findById.mockResolvedValue({ ...ANAS_EMPLOYEE, branchIds: [ANAS_BRANCH.id] });

      await call([ANAS_BRANCH.id]).expect(200);
    });

    it('lets them go when another Empleado also Ofrece the Servicio', async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          ...ANAS_SERVICE,
          id: 8,
          branchId: SECOND_BRANCH.id,
          employees: [
            { ...ANAS_SERVICE.employees[0], id: BRUNOS_EMPLOYEE.id },
            { ...ANAS_SERVICE.employees[0], id: 99 },
          ],
        },
      ]);

      await call([ANAS_BRANCH.id]).expect(200);
    });
  });
});
