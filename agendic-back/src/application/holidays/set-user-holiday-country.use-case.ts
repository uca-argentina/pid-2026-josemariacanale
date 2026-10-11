import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { BadRequestError } from '../../domain/errors';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import { findCalendarId } from '../../domain/holidays/holiday-calendars';
import { UserHolidays } from '../../domain/holidays/user-holiday-settings';
import {
  USER_HOLIDAY_SETTINGS_REPOSITORY,
  UserHolidaySettingsRepository,
} from '../../domain/holidays/user-holiday-settings.repository';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';
import { listHolidaysWithStatus } from './list-holidays-with-status';

/** Cambia el país o calendario religioso de los Días festivos del Usuario (ADR 0027). */
@Injectable()
export class SetUserHolidayCountryUseCase {
  constructor(
    @Inject(USER_HOLIDAY_SETTINGS_REPOSITORY)
    private readonly settings: UserHolidaySettingsRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    private readonly getHolidays: GetHolidaysForCountryUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Guarda el país y vacía los Días festivos apagados: cambiar de país arranca con todo prendido. `null` saca el país.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {BadRequestError} el código no está en `GET /holidays/countries`
   * @throws {ExternalServiceError} Google respondió con error
   */
  async execute(
    userId: number,
    countryCode: string | null,
  ): Promise<UserHolidays> {
    this.google.assertConfigured();
    if (countryCode !== null && !findCalendarId(countryCode))
      throw new BadRequestError(`Unknown holiday country ${countryCode}`);
    await this.settings.save(userId, { countryCode, disabledIds: [] });
    return listHolidaysWithStatus(
      this.getHolidays,
      this.clock,
      countryCode,
      [],
    );
  }
}
