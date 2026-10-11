import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import { HOLIDAY_CACHE_DAYS } from '../../domain/holidays/holiday-calendars';
import { Holiday } from '../../domain/holidays/holiday';
import {
  HOLIDAYS_REPOSITORY,
  HolidaysRepository,
} from '../../domain/holidays/holidays.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Los Días festivos de un país o calendario religioso en un año, desde la caché (ADR 0027). */
@Injectable()
export class GetHolidaysForCountryUseCase {
  constructor(
    @Inject(HOLIDAYS_REPOSITORY)
    private readonly holidays: HolidaysRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Va a Google solo cuando la caché de ese país y año no existe o tiene más de 7 días. Un código sin calendario devuelve `[]`.
   *
   * @throws {NotConfiguredError} hay que ir a Google y falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {ExternalServiceError} Google respondió con error
   */
  async execute(countryCode: string, year: number): Promise<Holiday[]> {
    const updatedAt = await this.holidays.findLatestUpdatedAt(countryCode, year);
    const staleBefore = this.clock.now().getTime() - HOLIDAY_CACHE_DAYS * DAY_MS;
    if (!updatedAt || updatedAt.getTime() < staleBefore) {
      await this.holidays.replaceByCountryCodeAndYear(
        countryCode,
        year,
        await this.google.fetchHolidays(countryCode, year),
      );
    }
    return this.holidays.listByCountryCodeAndYear(countryCode, year);
  }
}
