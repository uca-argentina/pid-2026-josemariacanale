import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import {
  USER_HOLIDAY_SETTINGS_REPOSITORY,
  UserHolidaySettingsRepository,
} from '../../domain/holidays/user-holiday-settings.repository';
import {
  ExternalServiceError,
  NotConfiguredError,
} from '../../domain/errors';
import {
  OutOfOfficePeriod,
  OutOfOfficeReason,
} from '../../domain/out-of-office/out-of-office';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';
import { isoDate } from './list-holidays-with-status';

/** Los Días festivos prendidos de un Usuario como períodos de un día, para que bloqueen como Fuera de la oficina (ADR 0027). */
@Injectable()
export class ListUserHolidayPeriodsUseCase {
  private readonly logger = new Logger(ListUserHolidayPeriodsUseCase.name);

  constructor(
    @Inject(USER_HOLIDAY_SETTINGS_REPOSITORY)
    private readonly settings: UserHolidaySettingsRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    private readonly getHolidays: GetHolidaysForCountryUseCase,
  ) {}

  /**
   * Los Días festivos prendidos del país del Usuario entre `from` y `to` (YYYY-MM-DD, inclusive), por fecha. Van después de los
   * períodos Fuera de la oficina para que, el mismo día, gane el período. Sin país,
   * o sin `GOOGLE_CALENDAR_API_KEY`, o si Google responde con error, ninguno: el cálculo de Horarios reservables sigue sin ellos.
   *
   * @throws {DatabaseOperationError} falla la caché o los settings del Usuario
   */
  async execute(
    userId: number,
    from: string,
    to: string,
  ): Promise<OutOfOfficePeriod[]> {
    const saved = await this.settings.findByUserId(userId);
    if (!saved?.countryCode) return [];
    try {
      this.google.assertConfigured();
    } catch (error) {
      if (error instanceof NotConfiguredError) return [];
      throw error;
    }

    const { countryCode } = saved;
    const disabled = new Set(saved.disabledIds);
    const years = new Set([+from.slice(0, 4), +to.slice(0, 4)]);
    let holidays;
    try {
      holidays = (
        await Promise.all(
          [...years].map((year) => this.getHolidays.execute(countryCode, year)),
        )
      ).flat();
    } catch (error) {
      if (!(error instanceof ExternalServiceError)) throw error;
      this.logger.error(
        `Días festivos of ${countryCode} ignored for user ${userId}: ${error.message}`,
      );
      return [];
    }
    return holidays
      .filter((h) => !disabled.has(h.eventId))
      .map((h) => ({ ...h, date: isoDate(h.date) }))
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
