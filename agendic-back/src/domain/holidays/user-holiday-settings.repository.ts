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
}
