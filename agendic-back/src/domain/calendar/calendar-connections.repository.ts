import { CalendarConnection } from './calendar-connection';

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
   * El refresh token ya descifrado, solo para hablar con Google; `null` sin conexión.
   *
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   * @throws {Error} la clave no es la que cifró, o el dato fue alterado
   */
  findRefreshTokenByUserId(userId: number): Promise<string | null>;

  /**
   * Guarda la conexión como `CONNECTED`; si el Usuario ya tenía una, la reemplaza.
   *
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   */
  save(userId: number, connection: NewCalendarConnection): Promise<void>;

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
