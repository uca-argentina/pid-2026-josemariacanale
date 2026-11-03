export const GOOGLE_CALENDAR_OAUTH = Symbol('GoogleCalendarOauth');

/** Lo que Google entrega al canjear el código de autorización. */
export interface GoogleGrant {
  refreshToken: string;
  email: string;
  /** Los permisos que el Usuario dejó tildados. */
  scopes: string[];
}

/** El flujo OAuth propio del back contra Google, no el de Clerk (ADR 0036). */
export interface GoogleCalendarOauth {
  /**
   * Avisa que falta la configuración, sin pedir nada a Google.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   */
  assertConfigured(): void;

  /**
   * La dirección de Google a la que se lleva al Usuario para dar el permiso.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   */
  authorizationUrl(state: string): string;

  /**
   * Canjea el código que Google mandó al callback.
   *
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   * @throws {ExternalServiceError} Google rechazó el código o no respondió
   */
  exchangeCode(code: string): Promise<GoogleGrant>;

  /**
   * Revoca el refresh token en Google.
   *
   * @throws {ExternalServiceError} Google rechazó la revocación o no respondió
   */
  revoke(refreshToken: string): Promise<void>;

  /** Si los permisos tildados alcanzan para leer los ocupados y escribir eventos. */
  hasRequiredScopes(scopes: string[]): boolean;
}
