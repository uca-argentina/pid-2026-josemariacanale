import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  GOOGLE_CALENDAR_CLIENT,
  GoogleCalendarClient,
} from '../../domain/holidays/google-calendar-client';
import { HolidayConflict } from '../../domain/holidays/user-holiday-settings';
import {
  USER_HOLIDAY_SETTINGS_REPOSITORY,
  UserHolidaySettingsRepository,
} from '../../domain/holidays/user-holiday-settings.repository';
import { localDate } from '../../domain/slots/slot';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';
import { listCalendarHolidays } from './list-holidays-with-status';

/** Los Turnos ya tomados del Usuario que caen en sus Días festivos prendidos (ADR 0027). */
@Injectable()
export class ListHolidayConflictsUseCase {
  constructor(
    @Inject(USER_HOLIDAY_SETTINGS_REPOSITORY)
    private readonly settings: UserHolidaySettingsRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(GOOGLE_CALENDAR_CLIENT)
    private readonly google: GoogleCalendarClient,
    private readonly getHolidays: GetHolidaysForCountryUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Un elemento por Día festivo prendido con Turnos pendientes o aceptados, futuros, que atiende el Usuario, por fecha.
   * El día de cada Turno se lee en la zona de la Availability con la que lo atiende. Sin país, `[]`.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {ExternalServiceError} Google respondió con error
   */
  async execute(userId: number): Promise<HolidayConflict[]> {
    this.google.assertConfigured();
    const saved = await this.settings.findByUserId(userId);
    if (!saved?.countryCode) return [];

    const disabled = new Set(saved.disabledIds);
    const byDate = new Map<string, HolidayConflict[]>();
    for (const h of await listCalendarHolidays(
      this.getHolidays,
      this.clock,
      saved.countryCode,
    )) {
      if (disabled.has(h.id)) continue;
      const conflict: HolidayConflict = {
        holidayId: h.id,
        holidayName: h.name,
        date: h.date,
        bookings: [],
      };
      byDate.set(h.date, [...(byDate.get(h.date) ?? []), conflict]);
    }

    const upcoming = await this.bookings.listUpcomingByUser(
      userId,
      this.clock.now(),
    );
    for (const { id, startsAt, clientName, timeZone } of upcoming)
      for (const conflict of byDate.get(localDate(startsAt, timeZone)) ?? [])
        conflict.bookings.push({ id, startsAt, clientName });

    return [...byDate.values()]
      .flat()
      .filter((c) => c.bookings.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
