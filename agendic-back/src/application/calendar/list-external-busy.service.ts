import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  CalendarAccessRevokedError,
  ExternalBusy,
  CALENDAR_EVENTS,
  CalendarEvents,
} from '../../domain/calendar/calendar-events';
import { CLOCK, Clock } from '../../domain/clock';

/** Cuánto vale lo que el proveedor contestó para el mismo Usuario y rango (ADR 0038). */
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
    @Inject(CALENDAR_EVENTS)
    private readonly events: CalendarEvents,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los ocupados de `userId` que se cruzan con `[from, to)`, con una caché de un minuto por Usuario y rango. Sin
   * Calendario conectado, o `DISCONNECTED`, ninguno. Fail-open: si el proveedor falla se loguea y el cálculo sigue sin ellos;
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
      // A failed read isn't cached: the next calculation (the re-check on Reservar included) asks the provider again.
      void read.then(({ failed }) => failed && this.cache.delete(key));
    }
    return entry.busy;
  }

  /** Olvida lo cacheado de `userId`, para que una selección de calendarios nueva se note enseguida. */
  forget(userId: number): void {
    for (const key of this.cache.keys())
      if (key.startsWith(`${userId}|`)) this.cache.delete(key);
  }

  private async read(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<{ busy: ExternalBusy[]; failed: boolean }> {
    try {
      const connection = await this.connections.findByUserId(userId);
      if (connection?.status !== 'CONNECTED')
        return { busy: [], failed: false };
      const credentials =
        await this.connections.findCredentialsByUserId(userId);
      if (!credentials) return { busy: [], failed: false };
      const calendarIds =
        await this.connections.findCheckedCalendarIdsByUserId(userId);
      // Nothing checked is a valid choice: the provider isn't asked at all.
      if (calendarIds.length === 0) return { busy: [], failed: false };
      return {
        busy: await this.events.listBusy(credentials, calendarIds, from, to),
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
        `El proveedor rechazó el refresh token del Usuario ${userId}; su Calendario conectado pasa a DISCONNECTED`,
      );
    } catch (error) {
      this.logger.error(
        `Calendario conectado del Usuario ${userId} no marcado como DISCONNECTED`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
