import { Clock } from '../../domain/clock';
import { UserHolidays } from '../../domain/holidays/user-holiday-settings';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Todos los Días festivos del calendario en el año en curso y el siguiente, con su fecha YYYY-MM-DD. Los años se leen
 * en UTC, como las fechas de la caché.
 */
export async function listCalendarHolidays(
  getHolidays: GetHolidaysForCountryUseCase,
  clock: Clock,
  countryCode: string,
) {
  const year = clock.now().getUTCFullYear();
  const [current, next] = await Promise.all([
    getHolidays.execute(countryCode, year),
    getHolidays.execute(countryCode, year + 1),
  ]);
  return [...current, ...next].map((h) => ({
    id: h.eventId,
    name: h.name,
    date: isoDate(h.date),
  }));
}

/** Los Días festivos de hoy en adelante, por fecha, cada uno con su toggle. Sin país, ninguno. */
export async function listHolidaysWithStatus(
  getHolidays: GetHolidaysForCountryUseCase,
  clock: Clock,
  countryCode: string | null,
  disabledIds: string[],
): Promise<UserHolidays> {
  if (!countryCode) return { countryCode: null, holidays: [] };
  const today = isoDate(clock.now());
  const disabled = new Set(disabledIds);
  const holidays = (await listCalendarHolidays(getHolidays, clock, countryCode))
    .filter((h) => h.date >= today)
    .map((h) => ({ ...h, enabled: !disabled.has(h.id) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { countryCode, holidays };
}
