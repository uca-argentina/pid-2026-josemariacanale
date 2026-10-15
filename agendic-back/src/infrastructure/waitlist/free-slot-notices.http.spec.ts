import { Logger } from '@nestjs/common';
import { SendFreeSlotNoticesUseCase } from '../../application/waitlist/send-free-slot-notices.use-case';
import { Availability } from '../../domain/availabilities/availability';
import { Service } from '../../domain/services/service';
import { AliveWaitlistEntry } from '../../domain/waitlist/waitlist-entry';
import {
  ANA,
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

/** Monday to Friday, 09:00–18:00. 2026-01-02 is a Friday. The TestClock starts on 2026-01-01. */
const AVAILABILITY: Availability = {
  id: 10,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: ANAS_BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

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

const DATE = '2026-01-02';

const entry = (over: Partial<AliveWaitlistEntry> = {}): AliveWaitlistEntry => ({
  id: 1,
  serviceId: ANAS_SERVICE.id,
  date: DATE,
  clientName: 'Carla Gómez',
  email: 'carla@example.com',
  link: 'secreto-1',
  notifiedAt: null,
  leftAt: null,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  timeZone: ANAS_BRANCH.timeZone,
  service: { name: ANAS_SERVICE.name, slug: 'corte' },
  business: { name: 'Estudio Ana', slug: 'estudio-ana' },
  branch: { name: 'Centro', slug: 'centro' },
  user: null,
  ...over,
});

describe('SendFreeSlotNoticesUseCase', () => {
  let t: TestApp;
  let run: () => Promise<void>;

  beforeEach(async () => {
    t = await createTestApp();
    const useCase = t.app.get(SendFreeSlotNoticesUseCase, { strict: false });
    run = () => useCase.execute();
    t.services.findById.mockImplementation(async (id) =>
      id === PERSONAL.id ? PERSONAL : id === ANAS_SERVICE.id ? ANAS_SERVICE : null,
    );
    t.branches.findById.mockResolvedValue(ANAS_BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByUser.mockResolvedValue([FULL_DAY]);
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry()]);
    t.waitlist.markNotified.mockResolvedValue();
    t.waitlist.rearm.mockResolvedValue();
    t.mailer.sendFreeSlotNotice.mockResolvedValue();
  });
  afterEach(() => t.app.close());

  const freeTheDay = () => t.bookings.listOccupiedByUser.mockResolvedValue([]);
  const fillTheDay = () => t.bookings.listOccupiedByUser.mockResolvedValue([FULL_DAY]);

  it('avisa a todos los anotados cuando se libera un horario, con los enlaces de un Servicio del Negocio', async () => {
    t.waitlist.listAliveIncludeService.mockResolvedValue([
      entry(),
      entry({ id: 2, email: 'dani@example.com', clientName: 'Dani Ñ', link: 'secreto-2' }),
    ]);
    freeTheDay();

    await run();

    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledTimes(2);
    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledWith(
      'carla@example.com',
      'Carla Gómez',
      ANAS_SERVICE.name,
      DATE,
      `/estudio-ana/centro/corte?fecha=${DATE}&nombre=Carla%20G%C3%B3mez&email=carla%40example.com`,
      'secreto-1',
    );
    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledWith(
      'dani@example.com',
      'Dani Ñ',
      ANAS_SERVICE.name,
      DATE,
      `/estudio-ana/centro/corte?fecha=${DATE}&nombre=Dani%20%C3%91&email=dani%40example.com`,
      'secreto-2',
    );
    expect(t.waitlist.markNotified).toHaveBeenCalledWith(1, t.clock.now());
    expect(t.waitlist.markNotified).toHaveBeenCalledWith(2, t.clock.now());
  });

  it('arma el enlace con el Enlace de reserva del Usuario en un Servicio personal', async () => {
    t.waitlist.listAliveIncludeService.mockResolvedValue([
      entry({
        serviceId: PERSONAL.id,
        service: { name: 'Consulta', slug: 'consulta' },
        business: null,
        branch: null,
        user: { slug: 'ana' },
      }),
    ]);
    freeTheDay();

    await run();

    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledWith(
      'carla@example.com',
      'Carla Gómez',
      'Consulta',
      DATE,
      `/ana/consulta?fecha=${DATE}&nombre=Carla%20G%C3%B3mez&email=carla%40example.com`,
      'secreto-1',
    );
  });

  it('con el día todavía lleno no manda nada ni escribe', async () => {
    await run();

    expect(t.mailer.sendFreeSlotNotice).not.toHaveBeenCalled();
    expect(t.waitlist.markNotified).not.toHaveBeenCalled();
    expect(t.waitlist.rearm).not.toHaveBeenCalled();
  });

  it('no repite el Aviso mientras el día siga con lugar', async () => {
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry({ notifiedAt: new Date('2026-01-01T11:00:00.000Z') })]);
    freeTheDay();

    await run();

    expect(t.mailer.sendFreeSlotNotice).not.toHaveBeenCalled();
    expect(t.waitlist.rearm).not.toHaveBeenCalled();
  });

  it('rearma la Anotación cuando el día se vuelve a llenar, y un horario nuevo manda un segundo Aviso', async () => {
    freeTheDay();
    await run();
    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledTimes(1);

    t.waitlist.listAliveIncludeService.mockResolvedValue([entry({ notifiedAt: t.clock.now() })]);
    fillTheDay();
    await run();
    expect(t.waitlist.rearm).toHaveBeenCalledWith(1);

    t.waitlist.listAliveIncludeService.mockResolvedValue([entry()]);
    freeTheDay();
    await run();
    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledTimes(2);
  });

  it('rearma también cuando el día deja de trabajarse', async () => {
    // 2026-01-03 is a Saturday: nobody works.
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry({ date: '2026-01-03', notifiedAt: t.clock.now() })]);
    freeTheDay();

    await run();

    expect(t.waitlist.rearm).toHaveBeenCalledWith(1);
    expect(t.mailer.sendFreeSlotNotice).not.toHaveBeenCalled();
  });

  it('si el mail falla no guarda notifiedAt y la vuelta siguiente lo reintenta', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    freeTheDay();
    t.mailer.sendFreeSlotNotice.mockRejectedValueOnce(new Error('SMTP caído'));

    await run();
    expect(t.waitlist.markNotified).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalled();

    await run();
    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledTimes(2);
    expect(t.waitlist.markNotified).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });

  it('un mail que falla no frena a los demás anotados', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry(), entry({ id: 2, email: 'dani@example.com' })]);
    freeTheDay();
    t.mailer.sendFreeSlotNotice.mockRejectedValueOnce(new Error('SMTP caído'));

    await run();

    expect(t.waitlist.markNotified).toHaveBeenCalledTimes(1);
    expect(t.waitlist.markNotified).toHaveBeenCalledWith(2, t.clock.now());
  });

  it('un Servicio que falla se loguea y no frena a los demás', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry({ serviceId: 99 }), entry({ id: 2 })]);
    freeTheDay();

    await run();

    expect(logged).toHaveBeenCalled();
    expect(t.waitlist.markNotified).toHaveBeenCalledTimes(1);
    expect(t.waitlist.markNotified).toHaveBeenCalledWith(2, t.clock.now());
  });

  it('ignora las Anotaciones de fechas pasadas en la zona del Servicio', async () => {
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry({ date: '2025-12-31', notifiedAt: t.clock.now() })]);
    freeTheDay();

    await run();

    expect(t.mailer.sendFreeSlotNotice).not.toHaveBeenCalled();
    expect(t.waitlist.rearm).not.toHaveBeenCalled();
  });

  it('no avisa si no hay Anotaciones vivas (las que Salieron o de un Servicio dado de baja no llegan)', async () => {
    t.waitlist.listAliveIncludeService.mockResolvedValue([]);
    freeTheDay();

    await run();

    expect(t.mailer.sendFreeSlotNotice).not.toHaveBeenCalled();
  });

  it('cubre Anotaciones separadas por más de 31 días con más de un tramo', async () => {
    t.waitlist.listAliveIncludeService.mockResolvedValue([entry(), entry({ id: 2, date: '2026-03-06' })]);
    freeTheDay();

    await run();

    expect(t.mailer.sendFreeSlotNotice).toHaveBeenCalledTimes(2);
  });
});
