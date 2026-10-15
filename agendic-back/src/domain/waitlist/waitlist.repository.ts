import { CreateWaitlistEntryInput, WaitlistEntry } from './waitlist-entry';

/** Injection token for the {@link WaitlistRepository} port. */
export const WAITLIST_REPOSITORY = Symbol('WaitlistRepository');

/** Anotaciones de la Lista de espera. */
export interface WaitlistRepository {
  /**
   * La Anotación viva (`leftAt` nulo) de ese email, ignorando mayúsculas, para ese Servicio y fecha.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  findAlive(
    serviceId: number,
    date: string,
    email: string,
  ): Promise<WaitlistEntry | null>;
  /**
   * Crea la Anotación con un Enlace secreto nuevo.
   *
   * @throws {ConflictError} ya hay una viva de ese email, Servicio y fecha
   */
  create(input: CreateWaitlistEntryInput): Promise<WaitlistEntry>;
}
