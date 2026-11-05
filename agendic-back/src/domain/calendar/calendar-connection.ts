/** Quién da el calendario: Google o Microsoft (Outlook o Microsoft 365). */
export type CalendarProvider = 'GOOGLE' | 'MICROSOFT';

/** `DISCONNECTED`: el proveedor dejó de aceptar el permiso, y el Usuario puede reconectar. */
export type CalendarConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

/** El Calendario conectado de un Usuario (ADR 0036). El refresh token no forma parte de esta vista. */
export interface CalendarConnection {
  provider: CalendarProvider;
  email: string;
  status: CalendarConnectionStatus;
  connectedAt: Date;
}

/** Con qué proveedor y qué refresh token (ya descifrado) se habla con el calendario de un Usuario. */
export interface CalendarCredentials {
  provider: CalendarProvider;
  refreshToken: string;
  /** Guarda el refresh token nuevo cuando el proveedor lo rota al renovar el acceso (Microsoft). */
  onRefreshTokenRotated?: (refreshToken: string) => Promise<void>;
}
