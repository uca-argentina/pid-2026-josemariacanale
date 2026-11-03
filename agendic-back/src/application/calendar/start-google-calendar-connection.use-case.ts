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
  GOOGLE_CALENDAR_OAUTH,
  GoogleCalendarOauth,
} from '../../domain/calendar/google-calendar-oauth';
import { CLOCK, Clock } from '../../domain/clock';
import { ConflictError } from '../../domain/errors';

/**
 * Arranca la conexión con Google: arma la dirección de Google a la que el front lleva al Usuario.
 *
 * Una conexión `DISCONNECTED` se puede reconectar: la nueva la reemplaza.
 *
 * @throws {NotConfiguredError} el entorno no tiene las credenciales OAuth de Google
 * @throws {ConflictError} el Usuario ya tiene un Calendario conectado `CONNECTED`
 */
@Injectable()
export class StartGoogleCalendarConnectionUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(GOOGLE_CALENDAR_OAUTH)
    private readonly google: GoogleCalendarOauth,
    @Inject(CALENDAR_OAUTH_STATE) private readonly state: CalendarOauthState,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Devuelve la dirección de Google con un `state` firmado que vence a los 10 minutos. */
  async execute(userId: number): Promise<{ authorizationUrl: string }> {
    this.google.assertConfigured();
    const current = await this.connections.findByUserId(userId);
    if (current?.status === 'CONNECTED')
      throw new ConflictError(`Calendar already connected for User ${userId}`);
    const state = this.state.sign(userId, this.clock.now());
    return { authorizationUrl: this.google.authorizationUrl(state) };
  }
}
