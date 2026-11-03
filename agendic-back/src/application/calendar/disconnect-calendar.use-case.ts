import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  GOOGLE_CALENDAR_OAUTH,
  GoogleCalendarOauth,
} from '../../domain/calendar/google-calendar-oauth';
import { NotFoundError } from '../../domain/errors';

const logger = new Logger('DisconnectCalendar');

/**
 * Desconecta el Calendario conectado del Usuario y revoca el token en Google.
 *
 * Si la revocación falla se loguea y la conexión se borra igual: dejarla viva sería peor que dejar un token
 * sin revocar que ya nadie guarda.
 */
@Injectable()
export class DisconnectCalendarUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(GOOGLE_CALENDAR_OAUTH)
    private readonly google: GoogleCalendarOauth,
  ) {}

  /** @throws {NotFoundError} el Usuario no tiene un Calendario conectado */
  async execute(userId: number): Promise<void> {
    if (!(await this.disconnectIfAny(userId)))
      throw new NotFoundError(`User ${userId} has no Calendario conectado`);
  }

  /** Lo mismo sin fallar cuando no hay nada que desconectar; devuelve si había una conexión. */
  async disconnectIfAny(userId: number): Promise<boolean> {
    const refreshToken =
      await this.connections.findRefreshTokenByUserId(userId);
    if (refreshToken === null) return false;
    try {
      await this.google.revoke(refreshToken);
    } catch (error) {
      logger.error(
        `Google token of User ${userId} not revoked`,
        error instanceof Error ? error.stack : String(error),
      );
    }
    await this.connections.deleteByUserId(userId);
    return true;
  }
}
