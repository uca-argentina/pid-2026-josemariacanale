import type { MyBadge } from '@/src/entities/models/badge';

/** Insignias del Usuario con Sesión contra la API del back. */
export interface IBadgesRepository {
    /**
     * Evalúa al Usuario y devuelve todas sus Insignias, en el orden del catálogo.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    listMyBadges(): Promise<MyBadge[]>;
}
