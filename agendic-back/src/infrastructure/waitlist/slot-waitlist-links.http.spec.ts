import { BookingStatus } from '../../domain/bookings/booking';
import { SlotWaitlistEntryDetail } from '../../domain/slot-waitlist/slot-waitlist-entry';
import { ANAS_SERVICE, createTestApp, TestApp } from '../../test-app';

const STARTS_AT = new Date('2026-01-02T15:00:00.000Z');

// The test clock starts at 2026-01-01T12:00:00Z.
const WAITING: SlotWaitlistEntryDetail = {
  id: 7,
  serviceId: ANAS_SERVICE.id,
  employeeId: null,
  startsAt: STARTS_AT,
  clientName: 'Carla',
  email: 'carla@example.com',
  link: 'secreto',
  offerBookingId: null,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  offeredAt: null,
  acceptedAt: null,
  leftAt: null,
  expiredAt: null,
  timeZone: 'America/Argentina/Buenos_Aires',
  service: { name: 'Haircut', slug: 'haircut' },
  business: { name: "Ana's Salon", slug: 'anas-salon' },
  branch: { name: 'Downtown', slug: 'downtown' },
  user: null,
  bookingLink: null,
};

const offeredMinutesAgo = (t: TestApp, minutes: number): SlotWaitlistEntryDetail => ({
  ...WAITING,
  offerBookingId: 50,
  offeredAt: new Date(t.clock.now().getTime() - minutes * 60_000),
  bookingLink: 'enlace-del-turno',
});

const FREED = { serviceId: ANAS_SERVICE.id, employeeId: 1, startsAt: STARTS_AT };

describe('/slot-waitlist-links/:secret', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockResolvedValue(ANAS_SERVICE);
  });
  afterEach(() => t.app.close());

  describe('GET', () => {
    it('abre una Anotación que espera, sin oferta', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(WAITING);

      const res = await t.http.get('/slot-waitlist-links/secreto').expect(200);

      expect(res.body).toEqual({
        startsAt: STARTS_AT.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
        status: 'WAITING',
        offerExpiresAt: null,
        bookingLink: null,
        service: { name: 'Haircut', slug: 'haircut' },
        business: { name: "Ana's Salon", slug: 'anas-salon' },
        branch: { name: 'Downtown', slug: 'downtown' },
        user: null,
      });
    });

    it('muestra la oferta vigente con su vencimiento a los 15 minutos, sin el Enlace del Turno', async () => {
      const offered = offeredMinutesAgo(t, 5);
      t.slotWaitlist.findByLink.mockResolvedValue(offered);

      const res = await t.http.get('/slot-waitlist-links/secreto').expect(200);

      expect(res.body).toMatchObject({
        status: 'OFFERED',
        offerExpiresAt: new Date(offered.offeredAt!.getTime() + 15 * 60_000).toISOString(),
        bookingLink: null,
      });
      expect(t.slotWaitlist.expireOffer).not.toHaveBeenCalled();
    });

    it('vence la oferta pasada de tiempo al abrirla y busca a la siguiente Anotación', async () => {
      t.slotWaitlist.findByLink
        .mockResolvedValueOnce(offeredMinutesAgo(t, 15))
        .mockResolvedValueOnce({ ...offeredMinutesAgo(t, 15), expiredAt: t.clock.now(), offerBookingId: null });
      t.slotWaitlist.expireOffer.mockResolvedValue(FREED);

      const res = await t.http.get('/slot-waitlist-links/secreto').expect(200);

      expect(res.body.status).toBe('EXPIRED');
      expect(t.slotWaitlist.expireOffer).toHaveBeenCalledWith(WAITING.id, t.clock.now());
      expect(t.slotWaitlist.findFirstEligible).toHaveBeenCalledWith(
        FREED.serviceId,
        FREED.employeeId,
        FREED.startsAt,
      );
    });

    it('404 con un secreto que no existe', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(null);

      const res = await t.http.get('/slot-waitlist-links/otro').expect(404);

      expect(res.body.message).toBe('Anotación not found');
    });
  });

  describe('POST /accept', () => {
    it('acepta la oferta vigente: el Turno queda BOOKED y devuelve su Enlace del Turno', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(offeredMinutesAgo(t, 14));
      t.slotWaitlist.accept.mockResolvedValue('enlace-del-turno');

      const res = await t.http.post('/slot-waitlist-links/secreto/accept').expect(200);

      expect(res.body).toEqual({ bookingLink: 'enlace-del-turno', status: 'BOOKED' });
      expect(t.slotWaitlist.accept).toHaveBeenCalledWith(
        WAITING.id,
        BookingStatus.BOOKED,
        t.clock.now(),
        new Date(t.clock.now().getTime() - 15 * 60_000),
      );
    });

    it('deja el Turno PENDING si el Servicio tiene Aprobación manual', async () => {
      t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, requiresApproval: true });
      t.slotWaitlist.findByLink.mockResolvedValue(offeredMinutesAgo(t, 1));
      t.slotWaitlist.accept.mockResolvedValue('enlace-del-turno');

      const res = await t.http.post('/slot-waitlist-links/secreto/accept').expect(200);

      expect(res.body.status).toBe('PENDING');
    });

    it('rechaza aceptar una oferta vencida y le ofrece el horario a la siguiente Anotación', async () => {
      const lapsed = offeredMinutesAgo(t, 20);
      t.slotWaitlist.findByLink.mockResolvedValue(lapsed);
      t.slotWaitlist.expireOffer.mockResolvedValue(FREED);

      const res = await t.http.post('/slot-waitlist-links/secreto/accept').expect(422);

      expect(res.body.message).toBe(
        `Offer expired at ${new Date(lapsed.offeredAt!.getTime() + 15 * 60_000).toISOString()}`,
      );
      expect(t.slotWaitlist.accept).not.toHaveBeenCalled();
      expect(t.slotWaitlist.expireOffer).toHaveBeenCalledWith(WAITING.id, t.clock.now());
      expect(t.slotWaitlist.findFirstEligible).toHaveBeenCalledWith(
        FREED.serviceId,
        FREED.employeeId,
        FREED.startsAt,
      );
    });

    it('rechaza aceptar una oferta vencida y no ofrece nada si nadie más espera: el horario queda libre', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(offeredMinutesAgo(t, 20));
      t.slotWaitlist.expireOffer.mockResolvedValue(FREED);
      t.slotWaitlist.findFirstEligible.mockResolvedValue(null);

      await t.http.post('/slot-waitlist-links/secreto/accept').expect(422);

      expect(t.slotWaitlist.expireOffer).toHaveBeenCalled();
      expect(t.slotWaitlist.createOffer).not.toHaveBeenCalled();
    });

    it('responde el mismo Turno al aceptar de nuevo una oferta ya aceptada', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue({
        ...offeredMinutesAgo(t, 30),
        acceptedAt: t.clock.now(),
      });

      const res = await t.http.post('/slot-waitlist-links/secreto/accept').expect(200);

      expect(res.body.bookingLink).toBe('enlace-del-turno');
      expect(t.slotWaitlist.accept).not.toHaveBeenCalled();
    });

    it('422 si la Anotación todavía no tiene oferta', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(WAITING);

      const res = await t.http.post('/slot-waitlist-links/secreto/accept').expect(422);

      expect(res.body.message).toBe('Anotación 7 has no open offer: it is WAITING');
    });

    it('409 si la oferta cambió entre leerla y aceptarla', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(offeredMinutesAgo(t, 1));
      t.slotWaitlist.accept.mockResolvedValue(null);

      await t.http.post('/slot-waitlist-links/secreto/accept').expect(409);
    });
  });

  describe('POST /leave', () => {
    it('204 y, si tenía una oferta, le pasa el horario a la siguiente Anotación', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue(offeredMinutesAgo(t, 1));
      t.slotWaitlist.leave.mockResolvedValue(FREED);

      await t.http.post('/slot-waitlist-links/secreto/leave').expect(204);

      expect(t.slotWaitlist.leave).toHaveBeenCalledWith(WAITING.id, t.clock.now());
      expect(t.slotWaitlist.findFirstEligible).toHaveBeenCalledWith(
        FREED.serviceId,
        FREED.employeeId,
        FREED.startsAt,
      );
    });

    it('204 sin tocar nada si ya había Salido', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue({ ...WAITING, leftAt: t.clock.now() });

      await t.http.post('/slot-waitlist-links/secreto/leave').expect(204);

      expect(t.slotWaitlist.leave).not.toHaveBeenCalled();
    });

    it('422 si ya aceptó la oferta', async () => {
      t.slotWaitlist.findByLink.mockResolvedValue({
        ...offeredMinutesAgo(t, 1),
        acceptedAt: t.clock.now(),
      });

      await t.http.post('/slot-waitlist-links/secreto/leave').expect(422);

      expect(t.slotWaitlist.leave).not.toHaveBeenCalled();
    });
  });
});
