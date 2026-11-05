import { CalendarProvider } from './calendar-connection';

export const CALENDAR_OAUTH = Symbol('CalendarOauth');

/** Lo que el proveedor entrega al canjear el código de autorización. */
export interface CalendarGrant {
  refreshToken: string;
  email: string;
  /** Los permisos que el Usuario dejó tildados. */
  scopes: string[];
}

/** El flujo OAuth propio del back contra un proveedor, no el de Clerk (ADR 0036). Lo implementa cada proveedor. */
export interface ProviderCalendarOauth {
  /**
   * Avisa que falta la configuración, sin pedir nada al proveedor.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   */
  assertConfigured(): void;

  /**
   * La dirección del proveedor a la que se lleva al Usuario para dar el permiso.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   */
  authorizationUrl(state: string): string;

  /**
   * Canjea el código que el proveedor mandó al callback.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor rechazó el código o no respondió
   */
  exchangeCode(code: string): Promise<CalendarGrant>;

  /**
   * Revoca el refresh token en el proveedor.
   *
   * @throws {ExternalServiceError} el proveedor rechazó la revocación o no respondió
   */
  revoke(refreshToken: string): Promise<void>;

  /** Si los permisos tildados alcanzan para leer los ocupados y escribir eventos. */
  hasRequiredScopes(scopes: string[]): boolean;
}

/** El flujo OAuth propio del back contral proveedor que se indique, no el de Clerk (ADR 0036). */
export interface CalendarOauth {
  /**
   * Avisa que falta la configuración, sin pedir nada al proveedor.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   */
  assertConfigured(provider: CalendarProvider): void;

  /**
   * La dirección del proveedor a la que se lleva al Usuario para dar el permiso.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   */
  authorizationUrl(provider: CalendarProvider, state: string): string;

  /**
   * Canjea el código que el proveedor mandó al callback.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor rechazó el código o no respondió
   */
  exchangeCode(provider: CalendarProvider, code: string): Promise<CalendarGrant>;

  /**
   * Revoca el refresh token en el proveedor.
   *
   * @throws {ExternalServiceError} el proveedor rechazó la revocación o no respondió
   */
  revoke(provider: CalendarProvider, refreshToken: string): Promise<void>;

  /** Si los permisos tildados alcanzan para leer los ocupados y escribir eventos. */
  hasRequiredScopes(provider: CalendarProvider, scopes: string[]): boolean;
}
