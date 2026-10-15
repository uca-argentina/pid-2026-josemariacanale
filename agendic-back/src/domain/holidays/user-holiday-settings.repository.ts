import { CausedCancellationOrder } from '../bookings/booking';
import { UserHolidaySettings } from './user-holiday-settings';

export const USER_HOLIDAY_SETTINGS_REPOSITORY = Symbol(
  'UserHolidaySettingsRepository',
);

/** Puerto de los Días festivos elegidos por el Usuario (`UserHolidaySettings`, ADR 0027). */
export interface UserHolidaySettingsRepository {
  /** Los del Usuario, o `null` si nunca eligió. */
  findByUserId(userId: number): Promise<UserHolidaySettings | null>;
  /** Guarda los del Usuario, creándolos si no había. */
  save(userId: number, settings: UserHolidaySettings): Promise<void>;
  /**
   * As `save`, and in the same transaction cancels the Turnos of `cancellations` (ADR 0034) that are still PENDING or
   * BOOKED and have not started by `now`: CANCELLED, `cancelledAt` = `now`, `cancelledBy` EMPLOYEE, with each one's Motivo
   * de cancelación and Causa. Returns the ids it really cancelled. If either write fails, neither stays.
   */
  saveCancelling(
    userId: number,
    settings: UserHolidaySettings,
    cancellations: CausedCancellationOrder[],
    now: Date,
  ): Promise<number[]>;
}
