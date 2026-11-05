import { CalendarConnection, CalendarCredentials } from './calendar-connection';

export const CALENDAR_CONNECTIONS_REPOSITORY = Symbol(
  'CalendarConnectionsRepository',
);

/** Los datos de una conexión nueva. */
export interface NewCalendarConnection {
  provider: CalendarConnection['provider'];
  email: string;
  refreshToken: string;
  connectedAt: Date;
}

/** Acceso al Calendario conectado de cada Usuario; a lo sumo uno (ADR 0036, ADR 0004). */
export interface CalendarConnectionsRepository {
  /** @throws {DatabaseOperationError} la base falló */
  findByUserId(userId: number): Promise<CalendarConnection | null>;

  /**
   * El proveedor y el refresh token ya descifrado, solo para hablar con el proveedor; `null` sin conexión.
   *
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   * @throws {Error} la clave no es la que cifró, o el dato fue alterado
   */
  findCredentialsByUserId(userId: number): Promise<CalendarCredentials | null>;

  /**
   * Los calendarios que cuentan como Ocupado externo (`'primary'` es el principal); `[]` si no hay conexión.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  findCheckedCalendarIdsByUserId(userId: number): Promise<string[]>;

  /**
   * Guarda qué calendarios cuentan como Ocupado externo; sin conexión no hace nada.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  saveCheckedCalendarIds(userId: number, ids: string[]): Promise<void>;

  /**
   * Guarda la conexión como `CONNECTED`; si el Usuario ya tenía una, la reemplaza. Reconectar la misma cuenta
   * conserva los calendarios tildados; otra cuenta vuelve al principal.
   *
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   */
  save(userId: number, connection: NewCalendarConnection): Promise<void>;

  /**
   * Reemplaza el refresh token de la conexión por el que el proveedor rotó; sin conexión no hace nada.
   *
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   */
  replaceRefreshToken(userId: number, refreshToken: string): Promise<void>;

  /**
   * Pasa la conexión a `DISCONNECTED`; sin conexión no hace nada.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  markDisconnected(userId: number): Promise<void>;

  /**
   * Borra la conexión del Usuario; sin conexión no hace nada.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  deleteByUserId(userId: number): Promise<void>;
}
