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
  CALENDAR_EVENTS,
  CalendarEvents,
} from '../../domain/calendar/calendar-events';
import { CalendarCredentials } from '../../domain/calendar/calendar-connection';
import { CLOCK, Clock } from '../../domain/clock';

const logger = new Logger('ReconcileBookingCalendarEvents');

/**
 * Deja el calendario principal de cada Usuario con Calendario conectado como los Turnos que atiende: un Evento del Turno
 * por cada Turno pendiente o aceptado que no terminó, y ninguno por los Cancelados o Rechazados (ADR 0038, #401).
 * Ningún caso de uso de Turnos llama al proveedor del calendario: este job mira los Turnos y compara con lo último que escribió.
 *
 * - Un Turno sin evento lo crea. Si nació de un Reagendar (ADR 0031), toma el evento del original y lo actualiza, en
 *   vez de borrar y recrear, salvo que quien lo atienda ahora sea otro Usuario: ahí el del anterior se borra y se
 *   crea uno nuevo.
 * - Un Turno cuyo contenido cambió desde la última vez actualiza su evento. Si no cambió no toca el calendario, así que un
 *   evento que el Usuario borró a mano no se recrea hasta que el Turno cambie.
 * - Un Turno Cancelado o Rechazado, por la causa que sea, pierde su evento. Los Turnos que ya pasaron quedan como están.
 *
 * Si el proveedor falla se loguea y se reintenta en la próxima vuelta. Si rechaza el token, la conexión pasa a
 * `DISCONNECTED` y el Usuario se saltea hasta que reconecte; sus filas quedan para retomar los eventos sin duplicarlos.
 */
@Injectable()
export class ReconcileBookingCalendarEventsUseCase {
  constructor(
    @Inject(BOOKING_CALENDAR_EVENTS_REPOSITORY)
    private readonly events: BookingCalendarEventsRepository,
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(CALENDAR_EVENTS)
    private readonly calendar: CalendarEvents,
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
    const tokens = new Map<number, CalendarCredentials | null>();

    for (const booking of await this.events.listLiveOfConnectedUsers(now)) {
      await this.guarded(booking.userId, tokens, booking.id, (credentials) =>
        this.upsert(booking, credentials, now),
      );
    }
    // After the live ones: a Reagendar's new Turno has already taken its original's event by now.
    for (const event of await this.events.listOfEndedBookingsOfConnectedUsers()) {
      await this.guarded(
        event.userId,
        tokens,
        event.bookingId,
        async (credentials) => {
          await this.calendar.deleteEvent(credentials, event.googleEventId);
          await this.events.deleteByBookingId(event.bookingId);
        },
      );
    }
  }

  private async upsert(
    booking: LiveBookingWithEvent,
    credentials: CalendarCredentials,
    now: Date,
  ) {
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
      const updated = await this.calendar.updateEvent(
        credentials,
        current.googleEventId,
        content,
      );
      if (updated) {
        await this.events.save({ ...current, fingerprint }, now);
        return;
      }
    }
    // No event yet, or the User deleted it by hand and the Turno has changed since: write a new one.
    const googleEventId = await this.calendar.createEvent(credentials, content);
    await this.events.save(
      {
        bookingId: booking.id,
        userId: booking.userId,
        googleEventId,
        fingerprint,
      },
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
    tokens: Map<number, CalendarCredentials | null>,
    bookingId: number,
    work: (credentials: CalendarCredentials) => Promise<void>,
  ) {
    try {
      if (!tokens.has(userId))
        tokens.set(
          userId,
          await this.connections.findCredentialsByUserId(userId),
        );
      const credentials = tokens.get(userId);
      if (!credentials) return;
      await work(credentials);
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
        `El proveedor rechazó el refresh token del Usuario ${userId}; su Calendario conectado pasa a DISCONNECTED`,
      );
    } catch (error) {
      logger.error(
        `Calendario conectado del Usuario ${userId} no marcado como DISCONNECTED`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
