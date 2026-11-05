import { z } from 'zod';

/** Proveedor del Calendario conectado: Google, o Microsoft (Outlook o Microsoft 365). */
export const calendarProviderSchema = z.enum(['GOOGLE', 'MICROSOFT']);
export type CalendarProvider = z.infer<typeof calendarProviderSchema>;

/** Estado del Calendario conectado: `DISCONNECTED` cuando el proveedor dejó de aceptar su permiso (se puede reconectar). */
export const calendarConnectionStatusSchema = z.enum(['CONNECTED', 'DISCONNECTED']);
export type CalendarConnectionStatus = z.infer<typeof calendarConnectionStatusSchema>;

/** El Calendario conectado del Usuario como lo devuelve `GET /users/me/calendar`. */
export const calendarConnectionSchema = z.object({
    provider: calendarProviderSchema,
    email: z.string(),
    status: calendarConnectionStatusSchema,
    connectedAt: z.string(),
});
export type CalendarConnection = z.infer<typeof calendarConnectionSchema>;

/** Si el proveedor dejó de aceptar el permiso del Calendario conectado; `false` si el Usuario no tiene ninguno. */
export const isCalendarDisconnected = (connection: Pick<CalendarConnection, 'status'> | null) => connection?.status === 'DISCONNECTED';

/** El cuerpo de `GET /users/me/calendar`: `connection` es `null` mientras el Usuario no conectó ninguno. */
export const myCalendarSchema = z.object({ connection: calendarConnectionSchema.nullable() });

/** Adónde llevar el navegador para que el Usuario dé su permiso al proveedor: el cuerpo de `POST /users/me/calendar/google` y `/microsoft`. */
export const calendarAuthorizationSchema = z.object({ authorizationUrl: z.string().url() });
export type CalendarAuthorization = z.infer<typeof calendarAuthorizationSchema>;

/** Un calendario de la cuenta conectada; `checked` es si cuenta como Ocupado externo. */
export const accountCalendarSchema = z.object({
    id: z.string(),
    name: z.string(),
    primary: z.boolean(),
    checked: z.boolean(),
});
export type AccountCalendar = z.infer<typeof accountCalendarSchema>;

/** El cuerpo de `GET` y `PUT /users/me/calendar/calendars`. */
export const accountCalendarsSchema = z.object({ calendars: z.array(accountCalendarSchema) });

/** Cómo volvió el Usuario del proveedor, según el `?calendar=` de la pantalla. */
export const calendarReturnSchema = z.enum(['connected', 'denied', 'missing-scope', 'error']);
export type CalendarReturn = z.infer<typeof calendarReturnSchema>;
