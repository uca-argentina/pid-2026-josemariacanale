import { WaitlistEntryView } from '../../domain/waitlist/waitlist-entry';
import { createTestApp, TestApp } from '../../test-app';

const VIEW: WaitlistEntryView = {
  id: 1,
  serviceId: 3,
  date: '2026-01-02',
  timeZone: 'America/Argentina/Buenos_Aires',
  left: false,
  service: { name: 'Corte', slug: 'corte' },
  business: { name: 'Estudio Ana', slug: 'estudio-ana' },
  branch: { name: 'Centro', slug: 'centro' },
  user: null,
};

describe('/waitlist-links/:secret', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    t.waitlist.findByLinkIncludeService.mockImplementation(async (link) =>
      link === 'secreto' ? VIEW : null,
    );
    t.waitlist.leave.mockResolvedValue();
  });
  afterEach(() => t.app.close());

  describe('GET', () => {
    it('abre la Anotación de un Servicio del Negocio', async () => {
      const res = await t.http.get('/waitlist-links/secreto').expect(200);

      expect(res.body).toEqual({
        date: '2026-01-02',
        timeZone: 'America/Argentina/Buenos_Aires',
        left: false,
        service: { name: 'Corte', slug: 'corte' },
        business: { name: 'Estudio Ana', slug: 'estudio-ana' },
        branch: { name: 'Centro', slug: 'centro' },
        user: null,
      });
    });

    it('abre la Anotación de un Servicio personal con el Enlace de reserva del Usuario', async () => {
      t.waitlist.findByLinkIncludeService.mockResolvedValue({
        ...VIEW,
        business: null,
        branch: null,
        user: { slug: 'ana' },
      });

      const res = await t.http.get('/waitlist-links/secreto').expect(200);

      expect(res.body).toMatchObject({
        business: null,
        branch: null,
        user: { slug: 'ana' },
      });
    });

    it('responde left en true cuando el Cliente ya Salió', async () => {
      t.waitlist.findByLinkIncludeService.mockResolvedValue({
        ...VIEW,
        left: true,
      });

      const res = await t.http.get('/waitlist-links/secreto').expect(200);

      expect(res.body.left).toBe(true);
    });

    it('404 con un secreto que no existe', async () => {
      const res = await t.http.get('/waitlist-links/otro').expect(404);

      expect(res.body.message).toBe('Anotación not found');
    });

    it('no modifica nada', async () => {
      await t.http.get('/waitlist-links/secreto').expect(200);

      expect(t.waitlist.leave).not.toHaveBeenCalled();
    });
  });

  describe('POST /leave', () => {
    it('204 y guarda la salida con la hora del reloj', async () => {
      await t.http.post('/waitlist-links/secreto/leave').expect(204);

      expect(t.waitlist.leave).toHaveBeenCalledWith(VIEW.id, t.clock.now());
    });

    it('204 las dos veces al Salir dos veces', async () => {
      await t.http.post('/waitlist-links/secreto/leave').expect(204);
      await t.http.post('/waitlist-links/secreto/leave').expect(204);
    });

    it('204 sin guardar nada si ya había Salido', async () => {
      t.waitlist.findByLinkIncludeService.mockResolvedValue({
        ...VIEW,
        left: true,
      });

      await t.http.post('/waitlist-links/secreto/leave').expect(204);

      expect(t.waitlist.leave).not.toHaveBeenCalled();
    });

    it('404 con un secreto que no existe, sin guardar nada', async () => {
      const res = await t.http.post('/waitlist-links/otro/leave').expect(404);

      expect(res.body.message).toBe('Anotación not found');
      expect(t.waitlist.leave).not.toHaveBeenCalled();
    });
  });
});
