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
import { MAILER, Mailer } from '../../domain/mailer';
import {
  LeftOutsideBooking,
  LeftOutsideBookingsService,
} from '../bookings/left-outside-bookings.service';
import { notifyCausedCancellations } from '../bookings/notify-caused-cancellations';
import { confirmedCancellations } from '../out-of-office/confirmed-cancellations';
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
    private readonly leftOutside: LeftOutsideBookingsService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Guarda el país y vacía los Días festivos apagados: cambiar de país arranca con todo prendido. `null` saca el país y no
   * cancela nada. Con país, cancela en la misma transacción los Turnos que los Días festivos nuevos dejan afuera
   * (ADR 0034) y avisa a sus Clientes.
   *
   * @param cancelBookingIds los Turnos que el Usuario vio en la vista previa y confirmó
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {BadRequestError} el código no está en `GET /holidays/countries`
   * @throws {ExternalServiceError} Google respondió con error
   * @throws {ConflictError} queda afuera algún Turno que `cancelBookingIds` no incluye
   */
  async execute(
    userId: number,
    countryCode: string | null,
    cancelBookingIds: number[] = [],
  ): Promise<UserHolidays & { cancelledBookings: number }> {
    const left = await this.preview(userId, countryCode);
    const settings = { countryCode, disabledIds: [] };
    let cancelledBookings = 0;
    if (left.length === 0) await this.settings.save(userId, settings);
    else {
      const cancelledIds = await this.settings.saveCancelling(
        userId,
        settings,
        confirmedCancellations(left, cancelBookingIds),
        this.clock.now(),
      );
      const cancelled = new Set(cancelledIds);
      await notifyCausedCancellations(
        this.mailer,
        left.filter((booking) => cancelled.has(booking.id)),
      );
      cancelledBookings = cancelledIds.length;
    }
    return {
      ...(await listHolidaysWithStatus(this.getHolidays, this.clock, countryCode, [])),
      cancelledBookings,
    };
  }

  /**
   * Los Turnos que elegir ese país dejaría afuera, sin guardar nada. Falla igual que guardarlo y en el mismo orden. `null`
   * no deja ninguno y no consulta a Google.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {BadRequestError} el código no está en `GET /holidays/countries`
   * @throws {ExternalServiceError} Google respondió con error
   */
  async preview(
    userId: number,
    countryCode: string | null,
  ): Promise<LeftOutsideBooking[]> {
    this.google.assertConfigured();
    if (countryCode !== null && !findCalendarId(countryCode))
      throw new BadRequestError(`Unknown holiday country ${countryCode}`);
    return this.leftOutside.forHolidays(userId, { countryCode, disabledIds: [] });
  }
}
