import {
  AliveWaitlistEntry,
  CreateWaitlistEntryInput,
  WaitlistEntry,
  WaitlistEntryView,
} from './waitlist-entry';

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
  /**
   * La Anotación de ese Enlace con su Servicio, viva o no, aunque la fecha haya pasado o el Servicio esté dado de baja.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  findByLinkIncludeService(link: string): Promise<WaitlistEntryView | null>;
  /**
   * Guarda que el Cliente Salió. No toca una Anotación que ya había salido.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  leave(id: number, now: Date): Promise<void>;
  /**
   * Las Anotaciones que no Salieron, de un Servicio sin Dar de baja y de una fecha que todavía puede ser hoy en alguna
   * zona horaria. Quien llama descarta las que ya pasaron en la zona de su Servicio.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  listAliveIncludeService(now: Date): Promise<AliveWaitlistEntry[]>;
  /**
   * Guarda que el Aviso de horario libre salió.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  markNotified(id: number, now: Date): Promise<void>;
  /**
   * Vuelve `notifiedAt` a nulo: el día se llenó de nuevo y el próximo horario libre vuelve a avisar.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  rearm(id: number): Promise<void>;
}
