import type { PersonalService } from '@/src/entities/models/service';
import type { Me, UserPage } from '@/src/entities/models/user';

/** The Usuario as the back knows them, and their Enlace de reserva (ADR 0021). */
export interface IUsersRepository {
    /**
     * Gets the Usuario of the SesiÃ³n, with their Enlace de reserva.
     *
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    getMe(): Promise<Me>;
    /**
     * Changes the Usuario's Enlace de reserva; the previous one stops working.
     *
     * @throws {SlugTakenError} another Usuario already uses it (409)
     * @throws {InvalidSlugError} it does not have a valid format (400)
     * @throws {ApiRequestError} any other failure
     */
    updateMySlug(slug: string): Promise<Me>;
    /**
     * Public: the page of a Usuario's Enlace de reserva, with their Servicios personales that are not hidden.
     *
     * @throws {NotFoundError} no Usuario has that Enlace de reserva (404)
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    getUserPage(userSlug: string): Promise<UserPage>;
    /**
     * Public: a Servicio personal by its tramo, even if hidden.
     *
     * @throws {NotFoundError} the Usuario or the Servicio do not exist, or it was dado de baja (404)
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    getPersonalService(userSlug: string, serviceSlug: string): Promise<PersonalService>;
    /**
     * Da de baja al Usuario de la Sesión (`DELETE /users/me`, ADR 0023). Repetirla es seguro.
     *
     * @throws {AuthProviderDeletionError} el back no pudo borrarlo en el Proveedor de autenticación (502)
     * @throws {ApiRequestError} any other failure
     */
    retireMe(): Promise<void>;
}
