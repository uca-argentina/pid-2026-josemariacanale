/** Día festivo de un país o calendario religioso, como lo guarda la caché (ADR 0027). */
export interface Holiday {
  countryCode: string;
  calendarId: string;
  eventId: string;
  name: string;
  /** UTC midnight of the festivo's day. */
  date: Date;
  year: number;
}

/** País o calendario religioso que el Usuario puede elegir; `code` es el de `holiday-calendars.ts`. */
export interface HolidayCountry {
  code: string;
  name: string;
}
