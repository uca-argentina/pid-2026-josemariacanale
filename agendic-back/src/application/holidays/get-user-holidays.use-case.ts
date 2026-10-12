import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import { UserHolidays } from '../../domain/holidays/user-holiday-settings';
import {
  USER_HOLIDAY_SETTINGS_REPOSITORY,
  UserHolidaySettingsRepository,
} from '../../domain/holidays/user-holiday-settings.repository';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';
import { listHolidaysWithStatus } from './list-holidays-with-status';

/** Los próximos Días festivos del Usuario según el país que eligió (ADR 0027). */
@Injectable()
export class GetUserHolidaysUseCase {
  constructor(
    @Inject(USER_HOLIDAY_SETTINGS_REPOSITORY)
    private readonly settings: UserHolidaySettingsRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    private readonly getHolidays: GetHolidaysForCountryUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los del año en curso y el siguiente desde hoy, por fecha; sin país, ninguno.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {ExternalServiceError} Google respondió con error
   */
  async execute(userId: number): Promise<UserHolidays> {
    this.google.assertConfigured();
    const saved = await this.settings.findByUserId(userId);
    return listHolidaysWithStatus(
      this.getHolidays,
      this.clock,
      saved?.countryCode ?? null,
      saved?.disabledIds ?? [],
    );
  }
}
