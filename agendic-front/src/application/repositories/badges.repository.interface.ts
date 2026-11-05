import type { MyBadge, UnseenBadge } from '@/src/entities/models/badge';

/** Insignias del Usuario con Sesión contra la API del back. */
export interface IBadgesRepository {
    /**
     * Evalúa al Usuario y devuelve todas sus Insignias, en el orden del catálogo.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    listMyBadges(): Promise<MyBadge[]>;

    /**
     * Evalúa al Usuario y devuelve los Niveles ganados que todavía no vio, del más antiguo al más reciente.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    listUnseenBadges(): Promise<UnseenBadge[]>;

    /**
     * Marca como vistos todos los Niveles sin ver del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    markBadgesSeen(): Promise<void>;
}
