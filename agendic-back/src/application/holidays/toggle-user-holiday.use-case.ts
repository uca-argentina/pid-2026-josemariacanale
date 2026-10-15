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
import { MAILER, Mailer } from '../../domain/mailer';
import {
  LeftOutsideBooking,
  LeftOutsideBookingsService,
} from '../bookings/left-outside-bookings.service';
import { notifyCausedCancellations } from '../bookings/notify-caused-cancellations';
import { confirmedCancellations } from '../out-of-office/confirmed-cancellations';
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
    private readonly leftOutside: LeftOutsideBookingsService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Apaga o vuelve a prender un Día festivo. Apagarlo no cancela nada; prenderlo cancela, en la misma transacción, los
   * Turnos de ese día que quedan afuera (ADR 0034) y avisa a sus Clientes.
   *
   * @param cancelBookingIds los Turnos que el Usuario vio en la vista previa y confirmó
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {NotFoundError} sin país, o el id no es del calendario del año en curso ni del siguiente
   * @throws {ExternalServiceError} Google respondió con error
   * @throws {ConflictError} queda afuera algún Turno que `cancelBookingIds` no incluye
   */
  async execute(
    userId: number,
    holidayId: string,
    enabled: boolean,
    cancelBookingIds: number[] = [],
  ): Promise<UserHolidays & { cancelledBookings: number }> {
    this.google.assertConfigured();
    const { saved, holiday } = await this.find(userId, holidayId);
    const disabled = new Set(saved.disabledIds);
    if (enabled) disabled.delete(holidayId);
    else disabled.add(holidayId);
    const updated = { countryCode: saved.countryCode, disabledIds: [...disabled] };

    const left = enabled
      ? await this.leftOutside.forHolidays(userId, updated, holiday.date)
      : [];
    let cancelledBookings = 0;
    if (left.length === 0) await this.settings.save(userId, updated);
    else {
      const cancelledIds = await this.settings.saveCancelling(
        userId,
        updated,
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
      ...(await listHolidaysWithStatus(
        this.getHolidays,
        this.clock,
        updated.countryCode,
        updated.disabledIds,
      )),
      cancelledBookings,
    };
  }

  /**
   * Los Turnos que prender el Día festivo dejaría afuera, sin guardar nada. Apagarlo no deja ninguno y no consulta a Google.
   *
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {NotFoundError} sin país, o el id no es del calendario del año en curso ni del siguiente
   * @throws {ExternalServiceError} Google respondió con error
   */
  async preview(
    userId: number,
    holidayId: string,
    enabled: boolean,
  ): Promise<LeftOutsideBooking[]> {
    this.google.assertConfigured();
    if (!enabled) return [];
    const { saved, holiday } = await this.find(userId, holidayId);
    return this.leftOutside.forHolidays(
      userId,
      {
        countryCode: saved.countryCode,
        disabledIds: saved.disabledIds.filter((id) => id !== holidayId),
      },
      holiday.date,
    );
  }

  private async find(userId: number, holidayId: string) {
    const saved = await this.settings.findByUserId(userId);
    const countryCode = saved?.countryCode;
    const calendar = countryCode
      ? await listCalendarHolidays(this.getHolidays, this.clock, countryCode)
      : [];
    const holiday = calendar.find((h) => h.id === holidayId);
    if (!countryCode || !holiday)
      throw new NotFoundError(`Holiday ${holidayId} not found`);
    return { saved: { countryCode, disabledIds: saved.disabledIds }, holiday };
  }
}
