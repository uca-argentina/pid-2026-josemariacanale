import { Holiday } from './holiday';

export const GOOGLE_CALENDAR_CLIENT = Symbol('GoogleCalendarClient');

/** Lee los Días festivos de Google Calendar (ADR 0027). */
export interface GoogleCalendarClient {
  /**
   * Avisa que falta la configuración, sin pedir nada a Google.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   */
  assertConfigured(): void;

  /**
   * Pide a Google los Días festivos de un país o calendario religioso en un año. Un código sin calendario devuelve `[]`.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {ExternalServiceError} Google respondió con error
   */
  fetchHolidays(countryCode: string, year: number): Promise<Holiday[]>;
}
