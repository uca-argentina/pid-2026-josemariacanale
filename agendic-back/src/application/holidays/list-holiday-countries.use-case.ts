import { Inject, Injectable } from '@nestjs/common';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import {
  COUNTRY_HOLIDAY_CALENDARS,
  RELIGIOUS_HOLIDAY_CALENDARS,
} from '../../domain/holidays/holiday-calendars';
import { HolidayCountry } from '../../domain/holidays/holiday';

const regionNames = new Intl.DisplayNames('es', { type: 'region' });

/** Los calendarios religiosos y los países entre los que el Usuario elige sus Días festivos. */
@Injectable()
export class ListHolidayCountriesUseCase {
  constructor(
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
  ) {}

  /**
   * Primero los cinco calendarios religiosos con nombre fijo, después los países por nombre en castellano.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   */
  execute(): HolidayCountry[] {
    this.google.assertConfigured();
    const religious = Object.entries(RELIGIOUS_HOLIDAY_CALENDARS).map(
      ([code, { name }]) => ({ code, name }),
    );
    const countries = Object.keys(COUNTRY_HOLIDAY_CALENDARS)
      .map((code) => ({ code, name: regionNames.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return [...religious, ...countries];
  }
}
