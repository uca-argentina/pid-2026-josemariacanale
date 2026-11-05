import { BadgeLevel, BadgeMetrics, EarnedLevel } from './badges';

/** Token de inyección del puerto {@link BadgesRepository}. */
export const BADGES_REPOSITORY = Symbol('BadgesRepository');

/** Acceso a las métricas de Insignias y a los Niveles ganados. */
export interface BadgesRepository {
  /**
   * Mide a varios Usuarios a la vez con una consulta agregada por métrica, agrupada por Usuario: el costo no
   * depende de cuántos se pidan. Un Usuario sin trabajo queda con las métricas en 0. Un Turno cuenta como atendido
   * con la regla del KPI `attended` de las analíticas, evaluada contra `now`.
   *
   * @throws {DatabaseOperationError} una consulta falló
   */
  measure(
    userIds: readonly number[],
    now: Date,
  ): Promise<Map<number, BadgeMetrics>>;

  /**
   * Los Niveles ganados de esos Usuarios, de todos los que haya.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  listEarned(userIds: readonly number[]): Promise<Map<number, EarnedLevel[]>>;

  /**
   * Guarda los Niveles que todavía no estaban, con `seenAt` en `null`. Los que ya existían se ignoran, así dos
   * evaluaciones simultáneas no duplican ni fallan. Nunca modifica ni borra un Nivel.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  saveEarned(
    levels: readonly {
      userId: number;
      badge: string;
      level: BadgeLevel;
      earnedAt: Date;
    }[],
  ): Promise<void>;

  /**
   * Marca como vistos todos los Niveles sin ver del Usuario.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  markSeen(userId: number, seenAt: Date): Promise<void>;
}
