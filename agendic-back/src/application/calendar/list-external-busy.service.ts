import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  CalendarAccessRevokedError,
  ExternalBusy,
  GOOGLE_CALENDAR_EVENTS,
  GoogleCalendarEvents,
} from '../../domain/calendar/google-calendar-events';
import { CLOCK, Clock } from '../../domain/clock';

/** Cuánto vale lo que Google contestó para el mismo Usuario y rango (ADR 0038). */
const CACHE_TTL_MS = 60_000;

/** Los Ocupados externos del Calendario conectado de un Usuario, leídos en vivo (ADR 0038). */
@Injectable()
export class ListExternalBusyService {
  private readonly logger = new Logger(ListExternalBusyService.name);
  private readonly cache = new Map<
    string,
    { at: number; busy: Promise<ExternalBusy[]> }
  >();

  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(GOOGLE_CALENDAR_EVENTS)
    private readonly events: GoogleCalendarEvents,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los ocupados de `userId` que se cruzan con `[from, to)`, con una caché de un minuto por Usuario y rango. Sin
   * Calendario conectado, o `DISCONNECTED`, ninguno. Fail-open: si Google falla se loguea y el cálculo sigue sin ellos;
   * si rechaza el refresh token, la conexión pasa a `DISCONNECTED`.
   */
  async execute(userId: number, from: Date, to: Date): Promise<ExternalBusy[]> {
    const now = this.clock.now().getTime();
    for (const [key, { at }] of this.cache)
      if (now - at >= CACHE_TTL_MS) this.cache.delete(key);

    const key = `${userId}|${from.getTime()}|${to.getTime()}`;
    let entry = this.cache.get(key);
    if (!entry) {
      const read = this.read(userId, from, to);
      entry = { at: now, busy: read.then(({ busy }) => busy) };
      this.cache.set(key, entry);
      // A failed read isn't cached: the next calculation (the re-check on Reservar included) asks Google again.
      void read.then(({ failed }) => failed && this.cache.delete(key));
    }
    return entry.busy;
  }

  private async read(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<{ busy: ExternalBusy[]; failed: boolean }> {
    try {
      const connection = await this.connections.findByUserId(userId);
      if (connection?.status !== 'CONNECTED') return { busy: [], failed: false };
      const refreshToken =
        await this.connections.findRefreshTokenByUserId(userId);
      if (!refreshToken) return { busy: [], failed: false };
      return {
        busy: await this.events.listBusy(refreshToken, from, to),
        failed: false,
      };
    } catch (error) {
      if (error instanceof CalendarAccessRevokedError)
        await this.disconnect(userId);
      else
        this.logger.error(
          `Ocupados externos del Usuario ${userId} no leídos; se calcula sin ellos`,
          error instanceof Error ? error.stack : String(error),
        );
      return { busy: [], failed: true };
    }
  }

  private async disconnect(userId: number) {
    try {
      await this.connections.markDisconnected(userId);
      this.logger.warn(
        `Google rechazó el refresh token del Usuario ${userId}; su Calendario conectado pasa a DISCONNECTED`,
      );
    } catch (error) {
      this.logger.error(
        `Calendario conectado del Usuario ${userId} no marcado como DISCONNECTED`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
