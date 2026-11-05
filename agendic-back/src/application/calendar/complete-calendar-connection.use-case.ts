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
  CALENDAR_OAUTH,
  CalendarOauth,
} from '../../domain/calendar/calendar-oauth';
import { CalendarProvider } from '../../domain/calendar/calendar-connection';
import { CLOCK, Clock } from '../../domain/clock';
import { DeleteFutureBookingEventsService } from './delete-future-booking-events.service';

/** Lo que el proveedor manda a la dirección de retorno. */
export interface CalendarCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

/** Cómo terminó el callback; el front lo lee en `?calendar=` (ADR 0036). */
export type CalendarCallbackResult =
  'connected' | 'denied' | 'missing-scope' | 'error';

/**
 * Los `error` con que el proveedor avisa que el Usuario (o el administrador de su empresa, en Microsoft) no dio el
 * permiso. Todo otro `error` es una falla.
 */
const DENIAL_ERRORS = ['access_denied', 'consent_required'];

const logger = new Logger('CompleteCalendarConnection');

/**
 * Cierra la conexión con un proveedor cuando el Usuario vuelve del permiso.
 *
 * Conectar otro proveedor, o otra cuenta del mismo, reemplaza la conexión anterior: antes se intentan borrar los
 * Eventos del Turno futuros del calendario anterior con su token, y si no se puede se dejan (el Usuario ya no es dueño
 * de ese acceso). Las filas se olvidan igual, así el job escribe los Turnos vivos en el calendario nuevo.
 *
 * Identifica al Usuario solo por el `state`. Cualquier falla se resuelve en un resultado, no en una excepción: el
 * callback lo abre el navegador y siempre tiene que terminar en una pantalla del front.
 *
 * @throws {NotConfiguredError} el entorno no tiene las credenciales OAuth del proveedor
 */
@Injectable()
export class CompleteCalendarConnectionUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    @Inject(CALENDAR_OAUTH)
    private readonly oauth: CalendarOauth,
    @Inject(CALENDAR_OAUTH_STATE) private readonly state: CalendarOauthState,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly deleteFutureEvents: DeleteFutureBookingEventsService,
  ) {}

  /** Devuelve cómo terminó; el `state` inválido o vencido es `error` y no consulta a Google. */
  async execute(
    provider: CalendarProvider,
    query: CalendarCallbackQuery,
  ): Promise<CalendarCallbackResult> {
    this.oauth.assertConfigured(provider);
    const now = this.clock.now();
    const userId = query.state ? this.state.verify(query.state, now) : null;
    if (userId === null) return 'error';
    if (query.error)
      return DENIAL_ERRORS.includes(query.error) ? 'denied' : 'error';
    if (!query.code) return 'error';
    try {
      const grant = await this.oauth.exchangeCode(provider, query.code);
      if (!this.oauth.hasRequiredScopes(provider, grant.scopes))
        return 'missing-scope';
      await this.leavePreviousAccount(userId, provider, grant.email);
      await this.connections.save(userId, {
        provider,
        email: grant.email,
        refreshToken: grant.refreshToken,
        connectedAt: now,
      });
      return 'connected';
    } catch (error) {
      logger.error(
        `${provider} Calendar not connected for User ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 'error';
    }
  }

  /** Si el Usuario tenía otro proveedor u otra cuenta, borra sus Eventos del Turno futuros con el token viejo; si no se puede, se dejan. */
  private async leavePreviousAccount(
    userId: number,
    provider: CalendarProvider,
    email: string,
  ) {
    const previous = await this.connections.findByUserId(userId);
    if (!previous) return;
    if (previous.provider === provider && previous.email === email) return;
    try {
      const credentials =
        await this.connections.findCredentialsByUserId(userId);
      await this.deleteFutureEvents.execute(userId, credentials);
    } catch (error) {
      logger.error(
        `Eventos del Turno del Usuario ${userId} no borrados de ${previous.provider} (${previous.email}); se dejan`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
