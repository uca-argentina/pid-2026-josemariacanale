import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReconcileBookingCalendarEventsUseCase } from '../../application/calendar/reconcile-booking-calendar-events.use-case';

/** Cada minuto deja los Eventos del Turno como los Turnos (ADR 0038, #401). */
@Injectable()
export class BookingCalendarEventsJob {
  private running = false;

  constructor(
    private readonly reconcile: ReconcileBookingCalendarEventsUseCase,
  ) {}

  /**
   * Corre una pasada del caso de uso.
   *
   * @throws {DatabaseOperationError} falló la base al buscar los Turnos
   */
  @Cron('* * * * *')
  async run() {
    // A slow pass must not overlap the next one: they would write the same events twice.
    if (this.running) return;
    this.running = true;
    try {
      await this.reconcile.execute();
    } finally {
      this.running = false;
    }
  }
}
