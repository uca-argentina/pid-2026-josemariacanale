import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  CalendarAccessRevokedError,
  CALENDAR_EVENTS,
  CalendarEvents,
  CalendarSummary,
  PRIMARY_CALENDAR_ID,
} from '../../domain/calendar/calendar-events';
import { ConflictError, NotFoundError } from '../../domain/errors';

const logger = new Logger('ConnectedCalendars');

/** Un calendario de la cuenta conectada y si cuenta como Ocupado externo. */
export interface CheckableCalendar extends CalendarSummary {
  checked: boolean;
}

/** Los calendarios de la cuenta del Calendario conectado, leídos del proveedor, con cuáles están tildados (ADR 0038). */
@Injectable()
export class ConnectedCalendarsService {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(CALENDAR_EVENTS)
    private readonly events: CalendarEvents,
  ) {}

  /**
   * Los calendarios de la cuenta conectada del Usuario. Si el proveedor rechaza el refresh token, la conexión pasa a
   * `DISCONNECTED`.
   *
   * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
   * @throws {ConflictError} el Calendario conectado está `DISCONNECTED`
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  async list(userId: number): Promise<CheckableCalendar[]> {
    const connection = await this.connections.findByUserId(userId);
    if (!connection) throw notConnected(userId);
    if (connection.status !== 'CONNECTED') throw disconnected(userId);
    const credentials = await this.connections.findCredentialsByUserId(userId);
    if (!credentials) throw notConnected(userId);
    let calendars: CalendarSummary[];
    try {
      calendars = await this.events.listCalendars(credentials);
    } catch (error) {
      if (!(error instanceof CalendarAccessRevokedError)) throw error;
      await this.connections.markDisconnected(userId);
      logger.warn(
        `El proveedor rechazó el refresh token del Usuario ${userId}; su Calendario conectado pasa a DISCONNECTED`,
      );
      throw disconnected(userId);
    }
    const checkedIds =
      await this.connections.findCheckedCalendarIdsByUserId(userId);
    return calendars.map((calendar) => ({
      ...calendar,
      checked:
        checkedIds.includes(calendar.id) ||
        (calendar.primary && checkedIds.includes(PRIMARY_CALENDAR_ID)),
    }));
  }
}

const notConnected = (userId: number) =>
  new NotFoundError(`User ${userId} has no Calendario conectado`);

const disconnected = (userId: number) =>
  new ConflictError(`Calendario conectado of User ${userId} is disconnected`);
