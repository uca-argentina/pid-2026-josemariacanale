import type { JoinWaitlist, WaitlistEntry } from '@/src/entities/models/waitlist';

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
}
