import { Inject, Injectable } from '@nestjs/common';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import {
  USER_HOLIDAY_SETTINGS_REPOSITORY,
  UserHolidaySettingsRepository,
} from '../../domain/holidays/user-holiday-settings.repository';
import { NotConfiguredError } from '../../domain/errors';
import {
  OutOfOffice,
  OutOfOfficeReason,
} from '../../domain/out-of-office/out-of-office';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';

/** Un Día festivo prendido, con la forma de un período Fuera de la oficina de un solo día. */
export type HolidayPeriod = Pick<
  OutOfOffice,
  'startDate' | 'endDate' | 'reason' | 'notes' | 'showNotePublicly'
>;

/** Los Días festivos prendidos de un Usuario como períodos de un día, para que bloqueen como Fuera de la oficina (ADR 0027). */
@Injectable()
export class ListUserHolidayPeriodsUseCase {
  constructor(
    @Inject(USER_HOLIDAY_SETTINGS_REPOSITORY)
    private readonly settings: UserHolidaySettingsRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    private readonly getHolidays: GetHolidaysForCountryUseCase,
  ) {}

  /**
   * Los Días festivos prendidos del país del Usuario entre `from` y `to` (YYYY-MM-DD, inclusive), por fecha. Sin país,
   * o sin `GOOGLE_CALENDAR_API_KEY`, ninguno: el cálculo de Horarios reservables sigue sin ellos.
   *
   * @throws {ExternalServiceError} Google respondió con error
   */
  async execute(
    userId: number,
    from: string,
    to: string,
  ): Promise<HolidayPeriod[]> {
    const saved = await this.settings.findByUserId(userId);
    if (!saved?.countryCode) return [];
    try {
      this.google.assertConfigured();
    } catch (error) {
      if (error instanceof NotConfiguredError) return [];
      throw error;
    }

    const disabled = new Set(saved.disabledIds);
    const years = new Set([+from.slice(0, 4), +to.slice(0, 4)]);
    const holidays = (
      await Promise.all(
        [...years].map((year) =>
          this.getHolidays.execute(saved.countryCode!, year),
        ),
      )
    ).flat();
    return holidays
      .filter((h) => !disabled.has(h.eventId))
      .map((h) => ({ ...h, date: h.date.toISOString().slice(0, 10) }))
      .filter((h) => from <= h.date && h.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({
        startDate: h.date,
        endDate: h.date,
        reason: OutOfOfficeReason.PUBLIC_HOLIDAY,
        notes: h.name,
        showNotePublicly: true,
      }));
  }
}
