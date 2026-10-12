import { BusinessRuleError } from '../errors';

/** Motivo: por qué un Usuario está Fuera de la oficina, de una lista fija. */
export enum OutOfOfficeReason {
  UNSPECIFIED = 'UNSPECIFIED',
  VACATION = 'VACATION',
  TRAVEL = 'TRAVEL',
  SICK_LEAVE = 'SICK_LEAVE',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
}

/** Fuera de la oficina: días enteros del Usuario, sin relación con sus Availabilities (ADR 0027). */
export interface OutOfOffice {
  id: number;
  userId: number;
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  /** YYYY-MM-DD, inclusive. */
  endDate: string;
  reason: OutOfOfficeReason;
  notes: string | null;
  showNotePublicly: boolean;
}

/** Lo que el cálculo de Horarios reservables lee de un período: sus fechas, Motivo y nota. */
export type OutOfOfficePeriod = Pick<
  OutOfOffice,
  'startDate' | 'endDate' | 'reason' | 'notes' | 'showNotePublicly'
>;

/** Lo que el Usuario carga de un período: todo menos `id` y `userId`. */
export type OutOfOfficeFields = Omit<OutOfOffice, 'id' | 'userId'>;

/**
 * Valida las fechas de un período.
 *
 * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
 */
export function assertValidOutOfOffice({
  startDate,
  endDate,
}: Pick<OutOfOfficeFields, 'startDate' | 'endDate'>): void {
  // YYYY-MM-DD compares in date order as text.
  if (endDate < startDate)
    throw new BusinessRuleError(
      'La fecha de fin no puede ser anterior a la de inicio',
    );
}
