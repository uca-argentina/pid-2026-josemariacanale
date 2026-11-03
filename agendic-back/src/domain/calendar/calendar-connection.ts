/** Quién da el calendario; hoy solo Google. */
export type CalendarProvider = 'GOOGLE';

/** `DISCONNECTED`: Google dejó de aceptar el permiso, y el Usuario puede reconectar. */
export type CalendarConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

/** El Calendario conectado de un Usuario (ADR 0036). El refresh token no forma parte de esta vista. */
export interface CalendarConnection {
  provider: CalendarProvider;
  email: string;
  status: CalendarConnectionStatus;
  connectedAt: Date;
}
