import { Holiday } from './holiday';

export const HOLIDAYS_REPOSITORY = Symbol('HolidaysRepository');

/** Caché de Días festivos en Postgres (`HolidayCache`, ADR 0027). */
export interface HolidaysRepository {
  /** Cuándo se guardó por última vez algún Día festivo de ese país y año; `null` si nunca se pidió. */
  findLatestUpdatedAt(countryCode: string, year: number): Promise<Date | null>;
  /** Los de ese país y año, por fecha. */
  listByCountryCodeAndYear(countryCode: string, year: number): Promise<Holiday[]>;
  /** Reemplaza todos los de ese país y año por `holidays`, en una transacción. */
  replaceByCountryCodeAndYear(
    countryCode: string,
    year: number,
    holidays: Holiday[],
  ): Promise<void>;
}
