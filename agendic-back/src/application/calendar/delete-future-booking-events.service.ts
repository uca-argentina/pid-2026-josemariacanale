import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BOOKING_CALENDAR_EVENTS_REPOSITORY,
  BookingCalendarEventsRepository,
} from '../../domain/calendar/booking-calendar-events.repository';
import {
  GOOGLE_CALENDAR_EVENTS,
  GoogleCalendarEvents,
} from '../../domain/calendar/google-calendar-events';
import { CLOCK, Clock } from '../../domain/clock';

const logger = new Logger('DeleteFutureBookingEvents');

/** Borra del calendario los Eventos del Turno futuros de un Usuario que se desconecta o se da de baja (ADR 0038, #401). */
@Injectable()
export class DeleteFutureBookingEventsService {
  constructor(
    @Inject(BOOKING_CALENDAR_EVENTS_REPOSITORY)
    private readonly events: BookingCalendarEventsRepository,
    @Inject(GOOGLE_CALENDAR_EVENTS)
    private readonly google: GoogleCalendarEvents,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Borra los eventos de los Turnos que no terminaron y después olvida todos los del Usuario: los pasados quedan en su
   * calendario. Se llama antes de revocar el token. Un fallo de Google se loguea y no frena la desconexión.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async execute(userId: number, refreshToken: string | null): Promise<void> {
    if (refreshToken !== null) {
      const future = await this.events.listFutureByUserId(
        userId,
        this.clock.now(),
      );
      for (const event of future) {
        try {
          await this.google.deleteEvent(refreshToken, event.googleEventId);
        } catch (error) {
          logger.error(
            `Evento del Turno ${event.bookingId} del Usuario ${userId} no borrado de Google`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }
    await this.events.deleteByUserId(userId);
  }
}
