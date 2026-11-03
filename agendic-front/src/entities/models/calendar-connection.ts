import { z } from 'zod';

/** Estado del Calendario conectado: `DISCONNECTED` cuando Google dejó de aceptar su permiso (se puede reconectar). */
export const calendarConnectionStatusSchema = z.enum(['CONNECTED', 'DISCONNECTED']);
export type CalendarConnectionStatus = z.infer<typeof calendarConnectionStatusSchema>;

/** El Calendario conectado del Usuario como lo devuelve `GET /users/me/calendar`. */
export const calendarConnectionSchema = z.object({
    provider: z.enum(['GOOGLE']),
    email: z.string(),
    status: calendarConnectionStatusSchema,
    connectedAt: z.string(),
});
export type CalendarConnection = z.infer<typeof calendarConnectionSchema>;

/** El cuerpo de `GET /users/me/calendar`: `connection` es `null` mientras el Usuario no conectó ninguno. */
export const myCalendarSchema = z.object({ connection: calendarConnectionSchema.nullable() });

/** Adónde llevar el navegador para que el Usuario dé su permiso a Google: el cuerpo de `POST /users/me/calendar/google`. */
export const googleAuthorizationSchema = z.object({ authorizationUrl: z.string().url() });
export type GoogleAuthorization = z.infer<typeof googleAuthorizationSchema>;

/** Cómo volvió el Usuario de Google, según el `?calendar=` de la pantalla. */
export const calendarReturnSchema = z.enum(['connected', 'denied', 'missing-scope', 'error']);
export type CalendarReturn = z.infer<typeof calendarReturnSchema>;
