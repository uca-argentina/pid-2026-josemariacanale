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
  findByUserId(userId: number): Promise<CalendarConnection | null>;

  /** El refresh token ya descifrado, solo para hablar con Google; `null` sin conexión. */
  findRefreshTokenByUserId(userId: number): Promise<string | null>;

  /** Guarda la conexión como `CONNECTED`; si el Usuario ya tenía una, la reemplaza. */
  save(userId: number, connection: NewCalendarConnection): Promise<void>;

  /** Borra la conexión del Usuario; sin conexión no hace nada. */
  deleteByUserId(userId: number): Promise<void>;
}
