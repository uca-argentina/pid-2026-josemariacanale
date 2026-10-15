import { z } from 'zod';
import { cancelBookingIdsSchema, cancelledBookingsSchema } from './left-outside-booking';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Calendario religioso o país entre los que el Usuario elige sus Días festivos, como lo manda `GET /holidays/countries`. */
export const holidayCountrySchema = z.object({ code: z.string(), name: z.string() });
export type HolidayCountry = z.infer<typeof holidayCountrySchema>;

/** Un Día festivo del país del Usuario; `enabled` es si bloquea sus Horarios reservables. */
export const holidaySchema = z.object({ id: z.string(), name: z.string(), date: dateSchema, enabled: z.boolean() });
export type Holiday = z.infer<typeof holidaySchema>;

/** Lo que responden `GET` y `PUT /users/me/holidays` y `PATCH /users/me/holidays/:holidayId`. */
export const holidaySettingsSchema = z.object({ countryCode: z.string().nullable(), holidays: holidaySchema.array() });
export type HolidaySettings = z.infer<typeof holidaySettingsSchema>;

/** Los Turnos tomados en un Día festivo prendido, como los manda `GET /users/me/holidays/conflicts`. */
export const holidayConflictSchema = z.object({
    holidayId: z.string(),
    holidayName: z.string(),
    date: dateSchema,
    bookings: z.object({ id: z.number(), startsAt: z.string(), clientName: z.string() }).array(),
});
export type HolidayConflict = z.infer<typeof holidayConflictSchema>;

/** El país del Usuario (`null` lo saca): el cuerpo de `PUT /users/me/holidays`. */
export const setHolidayCountrySchema = z.object({ countryCode: z.string().min(1).nullable() });
export type SetHolidayCountry = z.infer<typeof setHolidayCountrySchema>;

/** Prender o apagar un Día festivo: el `id` va en la ruta y `enabled` en el cuerpo de `PATCH`. */
export const toggleHolidaySchema = z.object({ holidayId: z.string().min(1), enabled: z.boolean() });
export type ToggleHoliday = z.infer<typeof toggleHolidaySchema>;

/** Cambiar el país con los Turnos que el Usuario confirmó cancelar por quedar afuera: el cuerpo de `PUT /users/me/holidays`. */
export const confirmedSetHolidayCountrySchema = setHolidayCountrySchema.extend({ cancelBookingIds: cancelBookingIdsSchema.optional() });
export type ConfirmedSetHolidayCountry = z.infer<typeof confirmedSetHolidayCountrySchema>;

/** Prender o apagar un Día festivo con los Turnos que el Usuario confirmó cancelar: el `id` va en la ruta y el resto en el cuerpo de `PATCH`. */
export const confirmedToggleHolidaySchema = toggleHolidaySchema.extend({ cancelBookingIds: cancelBookingIdsSchema.optional() });
export type ConfirmedToggleHoliday = z.infer<typeof confirmedToggleHolidaySchema>;

/** Lo que responden `PUT` y `PATCH /users/me/holidays`: los ajustes de siempre y cuántos Turnos canceló la escritura. */
export const savedHolidaySettingsSchema = holidaySettingsSchema.extend(cancelledBookingsSchema.shape);
export type SavedHolidaySettings = z.infer<typeof savedHolidaySettingsSchema>;
