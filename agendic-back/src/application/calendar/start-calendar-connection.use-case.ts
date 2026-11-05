import { Inject, Injectable } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import {
  CALENDAR_OAUTH_STATE,
  CalendarOauthState,
} from '../../domain/calendar/calendar-oauth-state';
import {
  CALENDAR_OAUTH,
  CalendarOauth,
} from '../../domain/calendar/calendar-oauth';
import { CLOCK, Clock } from '../../domain/clock';
import { CalendarProvider } from '../../domain/calendar/calendar-connection';
import { ConflictError } from '../../domain/errors';

/**
 * Arranca la conexión con un proveedor: arma la dirección del proveedor a la que el front lleva al Usuario.
 *
 * Una conexión `DISCONNECTED` se puede reconectar: la nueva la reemplaza.
 *
 * @throws {NotConfiguredError} el entorno no tiene las credenciales OAuth del proveedor
 * @throws {ConflictError} el Usuario ya tiene un Calendario conectado `CONNECTED`
 */
@Injectable()
export class StartCalendarConnectionUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(CALENDAR_OAUTH)
    private readonly oauth: CalendarOauth,
    @Inject(CALENDAR_OAUTH_STATE) private readonly state: CalendarOauthState,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Devuelve la dirección del proveedor con un `state` firmado que vence a los 10 minutos. */
  async execute(
    userId: number,
    provider: CalendarProvider,
  ): Promise<{ authorizationUrl: string }> {
    this.oauth.assertConfigured(provider);
    const current = await this.connections.findByUserId(userId);
    if (current?.status === 'CONNECTED')
      throw new ConflictError(`Calendar already connected for User ${userId}`);
    const state = this.state.sign(userId, this.clock.now());
    return { authorizationUrl: this.oauth.authorizationUrl(provider, state) };
  }
}
