export const CALENDAR_OAUTH_STATE = Symbol('CalendarOauthState');

/** El `state` del OAuth: firmado, lleva al Usuario y vence (ADR 0036). */
export interface CalendarOauthState {
  /**
   * @throws {NotConfiguredError} falta la clave con la que se firma
   */
  sign(userId: number, now: Date): string;

  /** El Usuario que firmó el `state`, o `null` si fue manipulado, está mal formado o venció. */
  verify(state: string, now: Date): number | null;
}
