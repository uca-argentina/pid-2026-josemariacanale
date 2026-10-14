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
import { UserHolidaySettings } from '../../domain/holidays/user-holiday-settings';
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
   * Cubre todos los años del rango.
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

    try {
      return await this.forSettings(saved, from, to);
    } catch (error) {
      if (!(error instanceof ExternalServiceError)) throw error;
      this.logger.error(
        `Días festivos of ${saved.countryCode} ignored for user ${userId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Los Días festivos prendidos según `settings` entre `from` y `to` (YYYY-MM-DD, inclusive), por fecha, de todos los años
   * del rango. A diferencia de `execute`, es estricto: lo usa el horario de después de un cambio de Días festivos
   * (ADR 0034), que no puede calcularse con datos que faltan.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {ExternalServiceError} Google respondió con error
   */
  async forSettings(
    settings: UserHolidaySettings,
    from: string,
    to: string,
  ): Promise<OutOfOfficePeriod[]> {
    const { countryCode } = settings;
    if (!countryCode) return [];
    this.google.assertConfigured();
    const disabled = new Set(settings.disabledIds);
    const holidays = (
      await Promise.all(
        yearsBetween(from, to).map((year) =>
          this.getHolidays.execute(countryCode, year),
        ),
      )
    ).flat();
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

/** Every year from the one of `from` to the one of `to`, not only the two ends. */
const yearsBetween = (from: string, to: string): number[] => {
  const first = +from.slice(0, 4);
  const last = +to.slice(0, 4);
  return Array.from({ length: Math.max(last - first + 1, 0) }, (_, i) => first + i);
};
