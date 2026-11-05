import type { CalendarProvider } from '@/src/entities/models/calendar-connection';

/** El nombre con que la pantalla llama a cada proveedor del Calendario conectado. */
export const CALENDAR_PROVIDER_NAMES: Record<CalendarProvider, string> = {
    GOOGLE: 'Google Calendar',
    MICROSOFT: 'Microsoft Calendar',
};

/** El otro proveedor: con la conexión `DISCONNECTED` se puede reconectar el mismo o conectar este. */
export const otherCalendarProvider = (provider: CalendarProvider): CalendarProvider => (provider === 'GOOGLE' ? 'MICROSOFT' : 'GOOGLE');

/** Los textos del Calendario conectado que más de un archivo muestra, para cambiarlos en un solo lugar. */
export const calendarDisconnectedNotice = (provider: CalendarProvider) =>
    `${provider === 'GOOGLE' ? 'Google' : 'Microsoft'} dejó de dar acceso, volvé a conectar.`;
export const calendarNotConfiguredMessage = (provider: CalendarProvider) => `${CALENDAR_PROVIDER_NAMES[provider]} todavía no está disponible. Probá más tarde.`;
export const calendarsUnavailableMessage = (provider: CalendarProvider) =>
    `${provider === 'GOOGLE' ? 'Google' : 'Microsoft'} no responde. Probá de nuevo en unos segundos.`;

/** Lo mismo cuando quien lo muestra no sabe el proveedor (las acciones solo ven el error). */
export const CALENDAR_DISCONNECTED_NOTICE = 'Tu calendario dejó de dar acceso, volvé a conectar.';
export const CALENDARS_UNAVAILABLE_MESSAGE = 'Tu calendario no responde. Probá de nuevo en unos segundos.';
export const CALENDAR_CONNECT_FAILED_MESSAGE = 'No pudimos conectar tu calendario. Intentá de nuevo.';
