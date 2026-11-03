import { Inject, Injectable, Logger } from '@nestjs/common';
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

/** Lo que Google manda a la dirección de retorno. */
export interface GoogleCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

/** Cómo terminó el callback; el front lo lee en `?calendar=` (ADR 0036). */
export type CalendarCallbackResult =
  | 'connected'
  | 'denied'
  | 'missing-scope'
  | 'error';

const logger = new Logger('CompleteGoogleCalendarConnection');

/**
 * Cierra la conexión con Google cuando el Usuario vuelve del permiso.
 *
 * Identifica al Usuario solo por el `state`. Cualquier falla se resuelve en un resultado, no en una excepción: el
 * callback lo abre el navegador y siempre tiene que terminar en una pantalla del front.
 *
 * @throws {NotConfiguredError} el entorno no tiene las credenciales OAuth de Google
 */
@Injectable()
export class CompleteGoogleCalendarConnectionUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(GOOGLE_CALENDAR_OAUTH)
    private readonly google: GoogleCalendarOauth,
    @Inject(CALENDAR_OAUTH_STATE) private readonly state: CalendarOauthState,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GoogleCallbackQuery): Promise<CalendarCallbackResult> {
    this.google.assertConfigured();
    const now = this.clock.now();
    const userId = query.state ? this.state.verify(query.state, now) : null;
    if (userId === null) return 'error';
    if (query.error)
      return query.error === 'access_denied' ? 'denied' : 'error';
    if (!query.code) return 'error';
    try {
      const grant = await this.google.exchangeCode(query.code);
      if (!this.google.hasRequiredScopes(grant.scopes)) return 'missing-scope';
      await this.connections.save(userId, {
        provider: 'GOOGLE',
        email: grant.email,
        refreshToken: grant.refreshToken,
        connectedAt: now,
      });
      return 'connected';
    } catch (error) {
      logger.error(
        `Google Calendar not connected for User ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 'error';
    }
  }
}
