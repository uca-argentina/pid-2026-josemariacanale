import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { addDays, DaySlots, localDate } from '../../domain/slots/slot';
import { AliveWaitlistEntry } from '../../domain/waitlist/waitlist-entry';
import {
  WAITLIST_REPOSITORY,
  WaitlistRepository,
} from '../../domain/waitlist/waitlist.repository';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';

const MAX_RANGE_DAYS = 31;

const logger = new Logger('SendFreeSlotNotices');

/** Path y query de la página de reserva del Servicio con el día elegido y el formulario precargado. */
function bookingPath(entry: AliveWaitlistEntry): string {
  let base: string;
  if (entry.business && entry.branch)
    base = `/${entry.business.slug}/${entry.branch.slug}/${entry.service.slug}`;
  else if (entry.user?.slug) base = `/${entry.user.slug}/${entry.service.slug}`;
  else
    throw new Error(
      `Anotación ${entry.id} has no Enlace de reserva to build the Aviso link`,
    );
  const query = [
    ['fecha', entry.date],
    ['nombre', entry.clientName],
    ['email', entry.email],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${base}?${query}`;
}

/**
 * Avisa a cada Anotación viva cuando su día vuelve a tener un Horario reservable, y rearma las de los días que se
 * llenaron de nuevo (ADR 0034). Cada Anotación recibe un solo Aviso mientras el día siga con lugar: `notifiedAt`
 * se guarda solo si el mail salió bien. Una Anotación cuyo email ya tiene un Turno vivo ese día se saltea: no se
 * avisa, no se marca ni se rearma, y vuelve a avisarse sola si el Cliente Cancela.
 *
 * Un Servicio o un mail que fallan se loguean y se reintentan en la próxima pasada, sin frenar a los demás.
 */
@Injectable()
export class SendFreeSlotNoticesUseCase {
  constructor(
    @Inject(WAITLIST_REPOSITORY) private readonly waitlist: WaitlistRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Una pasada: manda los Avisos pendientes y rearma las Anotaciones de los días llenos.
   *
   * @throws {DatabaseOperationError} falló la base al buscar las Anotaciones
   */
  async execute(): Promise<void> {
    const now = this.clock.now();
    const byService = new Map<number, AliveWaitlistEntry[]>();
    const upcoming = (await this.waitlist.listAliveIncludeService(now)).filter(
      (entry) => entry.date >= localDate(now, entry.timeZone),
    );
    const booked =
      upcoming.length > 0
        ? await this.waitlist.listWithLiveBooking(upcoming)
        : new Set<number>();
    for (const entry of upcoming) {
      if (booked.has(entry.id)) continue;
      byService.set(entry.serviceId, [
        ...(byService.get(entry.serviceId) ?? []),
        entry,
      ]);
    }
    for (const [serviceId, entries] of byService) {
      try {
        await this.processService(serviceId, entries, now);
      } catch (error) {
        logger.error(
          `Avisos de horario libre del Servicio ${serviceId} fallaron`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async processService(
    serviceId: number,
    entries: AliveWaitlistEntry[],
    now: Date,
  ) {
    const days = await this.daysOf(serviceId, entries);
    for (const entry of entries) {
      const day = days.get(entry.date);
      if (!day) continue;
      if (day.slots.length === 0) {
        if (entry.notifiedAt) await this.waitlist.rearm(entry.id);
      } else if (!entry.notifiedAt) {
        await this.notify(entry, now);
      }
    }
  }

  /** Los días de las fechas con Anotaciones, pidiendo tramos de hasta 31 días solo donde hay alguna. */
  private async daysOf(serviceId: number, entries: AliveWaitlistEntry[]) {
    const dates = [...new Set(entries.map((e) => e.date))].sort();
    const days = new Map<string, DaySlots>();
    let covered = '';
    for (const from of dates) {
      if (from <= covered) continue;
      const to = addDays(from, MAX_RANGE_DAYS - 1);
      const result = await this.listSlots.execute(serviceId, from, to);
      for (const day of result.days) days.set(day.date, day);
      covered = to;
    }
    return days;
  }

  private async notify(entry: AliveWaitlistEntry, now: Date) {
    try {
      await this.mailer.sendFreeSlotNotice(
        entry.email,
        entry.clientName,
        entry.service.name,
        entry.date,
        bookingPath(entry),
        entry.link,
      );
      await this.waitlist.markNotified(entry.id, now);
    } catch (error) {
      logger.error(
        `Aviso de horario libre de la Anotación ${entry.id} falló`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
