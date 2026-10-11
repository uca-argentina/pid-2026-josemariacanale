import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
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
import {
  listCalendarHolidays,
  listHolidaysWithStatus,
} from './list-holidays-with-status';

/** Apaga o vuelve a prender un Día festivo del Usuario (ADR 0027). */
@Injectable()
export class ToggleUserHolidayUseCase {
  constructor(
    @Inject(USER_HOLIDAY_SETTINGS_REPOSITORY)
    private readonly settings: UserHolidaySettingsRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    private readonly getHolidays: GetHolidaysForCountryUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {NotFoundError} sin país, o el id no es del calendario del año en curso ni del siguiente
   * @throws {ExternalServiceError} Google respondió con error
   */
  async execute(
    userId: number,
    holidayId: string,
    enabled: boolean,
  ): Promise<UserHolidays> {
    this.google.assertConfigured();
    const saved = await this.settings.findByUserId(userId);
    const countryCode = saved?.countryCode;
    const calendar = countryCode
      ? await listCalendarHolidays(this.getHolidays, this.clock, countryCode)
      : [];
    if (!countryCode || !calendar.some((h) => h.id === holidayId))
      throw new NotFoundError(`Holiday ${holidayId} not found`);

    const disabled = new Set(saved.disabledIds);
    if (enabled) disabled.delete(holidayId);
    else disabled.add(holidayId);
    const disabledIds = [...disabled];
    await this.settings.save(userId, { countryCode, disabledIds });
    return listHolidaysWithStatus(
      this.getHolidays,
      this.clock,
      countryCode,
      disabledIds,
    );
  }
}
