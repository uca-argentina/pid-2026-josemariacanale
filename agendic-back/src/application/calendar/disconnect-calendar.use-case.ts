import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  CALENDAR_OAUTH,
  CalendarOauth,
} from '../../domain/calendar/calendar-oauth';
import { NotFoundError } from '../../domain/errors';
import { DeleteFutureBookingEventsService } from './delete-future-booking-events.service';

const logger = new Logger('DisconnectCalendar');

/**
 * Desconecta el Calendario conectado del Usuario: borra sus Eventos del Turno futuros y después revoca el token en el proveedor.
 *
 * Si la revocación falla, o el token guardado no se puede descifrar (clave rotada), se loguea y la conexión se
 * borra igual: dejarla viva, o trabar la baja del Usuario, sería peor que dejar un token sin revocar que ya nadie guarda.
 */
@Injectable()
export class DisconnectCalendarUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(CALENDAR_OAUTH)
    private readonly oauth: CalendarOauth,
    private readonly deleteFutureEvents: DeleteFutureBookingEventsService,
  ) {}

  /** @throws {NotFoundError} el Usuario no tiene un Calendario conectado */
  async execute(userId: number): Promise<void> {
    if (!(await this.disconnectIfAny(userId)))
      throw new NotFoundError(`User ${userId} has no Calendario conectado`);
  }

  /**
   * Lo mismo sin fallar cuando no hay nada que desconectar; devuelve si había una conexión.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async disconnectIfAny(userId: number): Promise<boolean> {
    if (!(await this.connections.findByUserId(userId))) return false;
    try {
      const credentials =
        await this.connections.findCredentialsByUserId(userId);
      await this.deleteFutureEvents.execute(userId, credentials);
      if (credentials !== null)
        await this.oauth.revoke(credentials.provider, credentials.refreshToken);
    } catch (error) {
      logger.error(
        `Calendar token of User ${userId} not revoked`,
        error instanceof Error ? error.stack : String(error),
      );
    }
    await this.connections.deleteByUserId(userId);
    return true;
  }
}
