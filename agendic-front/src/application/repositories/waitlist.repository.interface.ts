import type { JoinWaitlist, WaitlistEntry, WaitlistEntryView } from '@/src/entities/models/waitlist';

/** Lista de espera de un Servicio. Es pública: no hay Sesión. */
export interface IWaitlistRepository {
    /**
     * Anota al Cliente en la Lista de espera del Servicio para esa fecha. Anotarse de nuevo (200) no es un error.
     *
     * @throws {InvalidVerificationCodeError} el código no es válido para clientEmail, o venció (400)
     * @throws {NotFoundError} el Servicio no existe o está dado de baja (404)
     * @throws {WaitlistDayNotFullError} el día tiene Horarios reservables (409)
     * @throws {WaitlistDateInPastError} la fecha ya pasó (422)
     */
    join(input: JoinWaitlist): Promise<WaitlistEntry>;

    /**
     * Abre la Anotación de un enlace de Salir de la Lista de espera. No la modifica.
     *
     * @throws {NotFoundError} el enlace no es de ninguna Anotación (404)
     */
    getByLink(link: string): Promise<WaitlistEntryView>;

    /**
     * Saca al Cliente de la Lista de espera. Salir de nuevo (204) no es un error.
     *
     * @throws {NotFoundError} el enlace no es de ninguna Anotación (404)
     */
    leave(link: string): Promise<void>;
}
