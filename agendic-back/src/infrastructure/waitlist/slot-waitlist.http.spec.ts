import { Availability } from '../../domain/availabilities/availability';
import { SlotWaitlistEntry } from '../../domain/slot-waitlist/slot-waitlist-entry';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

// Monday to Friday, 09:00–18:00 in Buenos Aires; 2026-01-02 is a Friday and the TestClock starts on 2026-01-01.
const AVAILABILITY: Availability = {
  id: 10,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: ANAS_BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

const STARTS_AT = '2026-01-02T15:00:00.000Z';

const FULL_DAY = {
  prepStartsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: new Date('2026-01-04T00:00:00.000Z'),
};

const BODY = {
  startsAt: STARTS_AT,
  clientName: 'Carla Gómez',
  clientEmail: 'carla@example.com',
  code: '123456',
};

const ENTRY: SlotWaitlistEntry = {
  id: 1,
  serviceId: ANAS_SERVICE.id,
  employeeId: null,
  startsAt: new Date(STARTS_AT),
  clientName: BODY.clientName,
  email: BODY.clientEmail,
  link: 'secreto',
  offerBookingId: null,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  offeredAt: null,
  acceptedAt: null,
  leftAt: null,
  expiredAt: null,
};

describe('POST /services/:id/slot-waitlist', () => {
  let t: TestApp;

  const join = (body: object = BODY) =>
    t.http.post(`/services/${ANAS_SERVICE.id}/slot-waitlist`).send(body);

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockResolvedValue(ANAS_SERVICE);
    t.branches.findById.mockResolvedValue(ANAS_BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByUser.mockResolvedValue([FULL_DAY]);
    t.bookings.listOccupiedStartsByService.mockResolvedValue([new Date(STARTS_AT)]);
    t.slotWaitlist.findAlive.mockResolvedValue(null);
    t.slotWaitlist.create.mockResolvedValue(ENTRY);
  });
  afterEach(() => t.app.close());

  it('anota en un horario tomado y devuelve el enlace para seguir la Anotación', async () => {
    const res = await join().expect(201);

    expect(res.body).toEqual({
      serviceId: ANAS_SERVICE.id,
      startsAt: STARTS_AT,
      link: 'secreto',
    });
    expect(t.slotWaitlist.create).toHaveBeenCalledWith({
      serviceId: ANAS_SERVICE.id,
      employeeId: null,
      startsAt: new Date(STARTS_AT),
      clientName: BODY.clientName,
      email: BODY.clientEmail,
    });
  });

  it('200 con el mismo enlace si ya había una Anotación viva para ese horario', async () => {
    t.slotWaitlist.findAlive.mockResolvedValue(ENTRY);

    const res = await join().expect(200);

    expect(res.body.link).toBe('secreto');
    expect(t.slotWaitlist.create).not.toHaveBeenCalled();
  });

  it('409 si el horario está libre: se reserva, no se espera', async () => {
    t.bookings.listOccupiedByUser.mockResolvedValue([]);

    const res = await join().expect(409);

    expect(res.body.message).toBe(`Slot ${STARTS_AT} is free for Service ${ANAS_SERVICE.id}`);
    expect(t.slotWaitlist.create).not.toHaveBeenCalled();
  });

  it('422 si no hay ningún Turno en ese horario que esperar', async () => {
    t.bookings.listOccupiedStartsByService.mockResolvedValue([]);

    const res = await join().expect(422);

    expect(res.body.message).toBe(
      `No Turno at ${STARTS_AT} in Service ${ANAS_SERVICE.id} to wait for`,
    );
  });

  it('400 con un código de verificación inválido, sin crear nada', async () => {
    t.bookingCodes.verify.mockReturnValue(false);

    await join().expect(400);

    expect(t.slotWaitlist.create).not.toHaveBeenCalled();
  });
});
