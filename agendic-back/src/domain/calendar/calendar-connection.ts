export type CalendarProvider = 'GOOGLE';

export type CalendarConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

/** El Calendario conectado de un Usuario (ADR 0036). El refresh token no forma parte de esta vista. */
export interface CalendarConnection {
  provider: CalendarProvider;
  email: string;
  status: CalendarConnectionStatus;
  connectedAt: Date;
}
