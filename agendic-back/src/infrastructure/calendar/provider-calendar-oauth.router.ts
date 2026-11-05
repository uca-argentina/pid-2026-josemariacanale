import { Injectable } from '@nestjs/common';
import { CalendarProvider } from '../../domain/calendar/calendar-connection';
import {
  CalendarGrant,
  CalendarOauth,
  ProviderCalendarOauth,
} from '../../domain/calendar/calendar-oauth';
import { GoogleOauthApiClient } from './google-oauth-api.client';
import { MicrosoftOauthApiClient } from './microsoft-oauth-api.client';

/** Manda cada llamada del flujo OAuth al cliente del proveedor indicado: ningún caso de uso sabe con cuál habla. */
@Injectable()
export class ProviderCalendarOauthRouter implements CalendarOauth {
  private readonly providers: Record<CalendarProvider, ProviderCalendarOauth>;

  constructor(
    google: GoogleOauthApiClient,
    microsoft: MicrosoftOauthApiClient,
  ) {
    this.providers = { GOOGLE: google, MICROSOFT: microsoft };
  }

  /** @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor */
  assertConfigured(provider: CalendarProvider) {
    this.providers[provider].assertConfigured();
  }

  /** @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor */
  authorizationUrl(provider: CalendarProvider, state: string) {
    return this.providers[provider].authorizationUrl(state);
  }

  /**
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor rechazó el código o no respondió
   */
  exchangeCode(
    provider: CalendarProvider,
    code: string,
  ): Promise<CalendarGrant> {
    return this.providers[provider].exchangeCode(code);
  }

  /** @throws {ExternalServiceError} el proveedor rechazó la revocación o no respondió */
  revoke(provider: CalendarProvider, refreshToken: string) {
    return this.providers[provider].revoke(refreshToken);
  }

  hasRequiredScopes(provider: CalendarProvider, scopes: string[]) {
    return this.providers[provider].hasRequiredScopes(scopes);
  }
}
