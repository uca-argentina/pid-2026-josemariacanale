import { Availability } from '../../domain/availabilities/availability';
import { Logger } from '@nestjs/common';
import { ConflictError } from '../../domain/errors';
import { OutOfOfficeReason } from '../../domain/out-of-office/out-of-office';
import { Service } from '../../domain/services/service';
import { WaitlistEntry } from '../../domain/waitlist/waitlist-entry';
import {
  ANA,
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

/** Monday to Friday, 09:00–18:00. 2026-01-02 is a Friday; 2026-01-03 is Saturday. The TestClock starts on 2026-01-01. */
const AVAILABILITY: Availability = {
  id: 10,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: ANAS_BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

/** Ana's Servicio personal, read in the Availability's zone. */
const PERSONAL: Service = {
  ...ANAS_SERVICE,
  id: 5,
  branchId: null,
  userId: ANA.id,
  availabilityId: AVAILABILITY.id,
  slug: 'consulta',
  employees: [],
};

const FULL_DAY = {
  prepStartsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: new Date('2026-01-04T00:00:00.000Z'),
};

const BODY = {
  date: '2026-01-02',
  clientName: 'Carla Gómez',
  clientEmail: 'carla@example.com',
  code: '123456',
};

const ENTRY: WaitlistEntry = {
  id: 1,
  serviceId: ANAS_SERVICE.id,
  date: BODY.date,
  clientName: BODY.clientName,
  email: BODY.clientEmail,
  link: 'secreto',
  notifiedAt: null,
  leftAt: null,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
};

describe('POST /services/:id/waitlist', () => {
  let t: TestApp;

  const join = (body: object = BODY, serviceId = ANAS_SERVICE.id) =>
    t.http.post(`/services/${serviceId}/waitlist`).send(body);

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockImplementation(async (id) =>
      id === PERSONAL.id ? PERSONAL : id === ANAS_SERVICE.id ? ANAS_SERVICE : null,
    );
    t.branches.findById.mockResolvedValue(ANAS_BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByUser.mockResolvedValue([FULL_DAY]);
    t.waitlist.findAlive.mockResolvedValue(null);
    t.waitlist.create.mockResolvedValue(ENTRY);
    t.mailer.sendWaitlistConfirmation.mockResolvedValue();
  });
  afterEach(() => t.app.close());

  it.each([
    ['del Negocio', ANAS_SERVICE.id],
    ['personal', PERSONAL.id],
  ])('anota en un día FULLY_BOOKED de un Servicio %s y manda la Confirmación de anotación', async (_, id) => {
    const res = await join(BODY, id).expect(201);

    expect(res.body).toEqual({ serviceId: id, date: BODY.date });
    expect(t.waitlist.create).toHaveBeenCalledWith({
      serviceId: id,
      date: BODY.date,
      clientName: BODY.clientName,
      email: BODY.clientEmail,
    });
    expect(t.mailer.sendWaitlistConfirmation).toHaveBeenCalledWith(
      BODY.clientEmail,
      BODY.clientName,
      expect.any(String),
      BODY.date,
      ENTRY.link,
    );
  });

  it('valida el código con el email recortado y en minúsculas', async () => {
    await join({ ...BODY, clientEmail: '  Carla@Example.com ' }).expect(201);

    expect(t.bookingCodes.verify).toHaveBeenCalledWith('carla@example.com', BODY.code);
  });

  it('200 sin mail al repetir una Anotación viva', async () => {
    t.waitlist.findAlive.mockResolvedValue(ENTRY);

    const res = await join().expect(200);

    expect(res.body).toEqual({ serviceId: ANAS_SERVICE.id, date: BODY.date });
    expect(t.waitlist.create).not.toHaveBeenCalled();
    expect(t.mailer.sendWaitlistConfirmation).not.toHaveBeenCalled();
  });

  it('200 si otra Anotación igual se creó justo antes', async () => {
    t.waitlist.create.mockRejectedValue(new ConflictError('ya existe'));

    await join().expect(200);

    expect(t.mailer.sendWaitlistConfirmation).not.toHaveBeenCalled();
  });

  it('201 de nuevo si la anterior ya Salió (el repositorio no la ve viva)', async () => {
    await join().expect(201);
    await join().expect(201);

    expect(t.mailer.sendWaitlistConfirmation).toHaveBeenCalledTimes(2);
  });

  it('si el mail falla, lo loguea y igual responde 201', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    t.mailer.sendWaitlistConfirmation.mockRejectedValue(new Error('SMTP caído'));

    await join().expect(201);

    expect(t.waitlist.create).toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining(BODY.clientEmail),
      expect.stringContaining('SMTP caído'),
    );
    logged.mockRestore();
  });

  it('409 en un día con horarios', async () => {
    t.bookings.listOccupiedByUser.mockResolvedValue([]);

    const res = await join().expect(409);

    expect(res.body.message).toBe(
      `Date ${BODY.date} is not fully booked for Service ${ANAS_SERVICE.id}`,
    );
    expect(t.waitlist.create).not.toHaveBeenCalled();
  });

  it('409 en un día que nadie trabaja', async () => {
    await join({ ...BODY, date: '2026-01-03' }).expect(409);
  });

  it('409 en un día Fuera de la oficina de un Servicio personal', async () => {
    t.bookings.listOccupiedByUser.mockResolvedValue([]);
    t.outOfOffice.listByUserEndingFrom.mockResolvedValue([
      {
        id: 1,
        userId: ANA.id,
        startDate: BODY.date,
        endDate: BODY.date,
        reason: OutOfOfficeReason.VACATION,
        notes: null,
        showNotePublicly: false,
      },
    ]);

    await join(BODY, PERSONAL.id).expect(409);
  });

  it('422 en una fecha anterior a hoy en la zona del Servicio', async () => {
    const res = await join({ ...BODY, date: '2025-12-31' }).expect(422);

    expect(res.body.message).toBe('Date 2025-12-31 is in the past');
  });

  it('404 si el Servicio no existe o está dado de baja', async () => {
    await join(BODY, 999).expect(404);
    t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, deletedAt: new Date() });

    const res = await join().expect(404);

    expect(res.body.message).toBe('Service not found or retired');
  });

  it('400 con un código inválido, sin crear nada', async () => {
    t.bookingCodes.verify.mockReturnValue(false);

    const res = await join().expect(400);

    expect(res.body.message).toBe(
      `Invalid or expired verification code for ${BODY.clientEmail}`,
    );
    expect(t.waitlist.create).not.toHaveBeenCalled();
  });

  it.each([
    ['sin fecha', { ...BODY, date: undefined }],
    ['con una fecha mal formada', { ...BODY, date: '02/01/2026' }],
    ['con una fecha inexistente', { ...BODY, date: '2026-02-31' }],
    ['sin nombre', { ...BODY, clientName: ' ' }],
    ['con un email inválido', { ...BODY, clientEmail: 'no-es-email' }],
    ['sin código', { ...BODY, code: undefined }],
  ])('400 %s', async (_, body) => {
    await join(body).expect(400);
  });
});
