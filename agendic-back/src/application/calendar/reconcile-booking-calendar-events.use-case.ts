import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BOOKING_CALENDAR_EVENTS_REPOSITORY,
  BookingCalendarEventsRepository,
  LiveBookingWithEvent,
  StoredBookingEvent,
} from '../../domain/calendar/booking-calendar-events.repository';
import {
  BOOKING_PANEL_LINKS,
  BookingPanelLinks,
  bookingEventContent,
  eventFingerprint,
} from '../../domain/calendar/booking-event';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  CalendarAccessRevokedError,
  GOOGLE_CALENDAR_EVENTS,
  GoogleCalendarEvents,
} from '../../domain/calendar/google-calendar-events';
import { CLOCK, Clock } from '../../domain/clock';

const logger = new Logger('ReconcileBookingCalendarEvents');

/**
 * Deja el calendario principal de cada Usuario con Calendario conectado como los Turnos que atiende: un Evento del Turno
 * por cada Turno pendiente o aceptado que no terminó, y ninguno por los Cancelados o Rechazados (ADR 0038, #401).
 * Ningún caso de uso de Turnos llama a Google: este job mira los Turnos y compara con lo último que escribió.
 *
 * - Un Turno sin evento lo crea. Si nació de un Reagendar (ADR 0031), toma el evento del original y lo actualiza, en
 *   vez de borrar y recrear, salvo que quien lo atienda ahora sea otro Usuario: ahí el del anterior se borra y se
 *   crea uno nuevo.
 * - Un Turno cuyo contenido cambió desde la última vez actualiza su evento. Si no cambió no toca Google, así que un
 *   evento que el Usuario borró a mano no se recrea hasta que el Turno cambie.
 * - Un Turno Cancelado o Rechazado, por la causa que sea, pierde su evento. Los Turnos que ya pasaron quedan como están.
 *
 * Si Google falla se loguea y se reintenta en la próxima vuelta. Si rechaza el token, la conexión pasa a
 * `DISCONNECTED` y el Usuario se saltea hasta que reconecte; sus filas quedan para retomar los eventos sin duplicarlos.
 */
@Injectable()
export class ReconcileBookingCalendarEventsUseCase {
  constructor(
    @Inject(BOOKING_CALENDAR_EVENTS_REPOSITORY)
    private readonly events: BookingCalendarEventsRepository,
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(GOOGLE_CALENDAR_EVENTS)
    private readonly google: GoogleCalendarEvents,
    @Inject(BOOKING_PANEL_LINKS) private readonly links: BookingPanelLinks,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Una pasada de reconciliación de todos los Usuarios con Calendario conectado.
   *
   * @throws {DatabaseOperationError} falló la base al buscar los Turnos
   */
  async execute(): Promise<void> {
    const now = this.clock.now();
    // Token by User; `null` = skip him this pass (revoked, or no token to use).
    const tokens = new Map<number, string | null>();

    for (const booking of await this.events.listLiveOfConnectedUsers(now)) {
      await this.guarded(booking.userId, tokens, booking.id, (token) =>
        this.upsert(booking, token, now),
      );
    }
    // After the live ones: a Reagendar's new Turno has already taken its original's event by now.
    for (const event of await this.events.listOfEndedBookingsOfConnectedUsers()) {
      await this.guarded(event.userId, tokens, event.bookingId, async (token) => {
        await this.google.deleteEvent(token, event.googleEventId);
        await this.events.deleteByBookingId(event.bookingId);
      });
    }
  }

  private async upsert(booking: LiveBookingWithEvent, token: string, now: Date) {
    const content = bookingEventContent(
      booking,
      this.links.bookingUrl(booking.id),
    );
    const fingerprint = eventFingerprint(content);
    let current = booking.event;
    if (!current && booking.fromRescheduleId !== null)
      current = await this.takeOverPreviousEvent(booking);
    if (current?.fingerprint === fingerprint) return;

    if (current) {
      const updated = await this.google.updateEvent(
        token,
        current.googleEventId,
        content,
      );
      if (updated) {
        await this.events.save({ ...current, fingerprint }, now);
        return;
      }
    }
    // No event yet, or the User deleted it by hand and the Turno has changed since: write a new one.
    const googleEventId = await this.google.createEvent(token, content);
    await this.events.save(
      { bookingId: booking.id, userId: booking.userId, googleEventId, fingerprint },
      now,
    );
  }

  /** El evento del Turno que este reemplazó, ya a su nombre; si lo atendía otro Usuario no se hereda (se borra al pasar por los terminados). */
  private async takeOverPreviousEvent(
    booking: LiveBookingWithEvent,
  ): Promise<StoredBookingEvent | null> {
    const previous = await this.events.findEventOfPreviousBooking(booking.id);
    if (!previous || previous.userId !== booking.userId) return null;
    await this.events.moveToBooking(previous.bookingId, booking.id);
    return { ...previous, bookingId: booking.id };
  }

  /** Corre `work` con el token del Usuario; un fallo se loguea y no frena a los demás, y un token rechazado deja de intentar con ese Usuario. */
  private async guarded(
    userId: number,
    tokens: Map<number, string | null>,
    bookingId: number,
    work: (token: string) => Promise<void>,
  ) {
    try {
      if (!tokens.has(userId))
        tokens.set(userId, await this.connections.findRefreshTokenByUserId(userId));
      const token = tokens.get(userId);
      if (!token) return;
      await work(token);
    } catch (error) {
      if (error instanceof CalendarAccessRevokedError) {
        tokens.set(userId, null);
        await this.disconnect(userId);
        return;
      }
      logger.error(
        `Evento del Turno ${bookingId} del Usuario ${userId} no sincronizado; se reintenta`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async disconnect(userId: number) {
    try {
      await this.connections.markDisconnected(userId);
      logger.warn(
        `Google rechazó el refresh token del Usuario ${userId}; su Calendario conectado pasa a DISCONNECTED`,
      );
    } catch (error) {
      logger.error(
        `Calendario conectado del Usuario ${userId} no marcado como DISCONNECTED`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
