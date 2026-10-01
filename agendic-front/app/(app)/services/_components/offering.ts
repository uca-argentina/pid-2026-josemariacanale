/** Lo que Ofrecer necesita saber de un Servicio: si el Usuario lo atiende y quiénes más. */
export interface OfferableService {
    name: string;
    offeredByMe: boolean;
    /** Los nombres de los otros Empleados que lo atienden. */
    otherEmployees: string[];
}

/** Un Servicio no puede quedar sin nadie que lo atienda: solo lo dejás si otro Empleado lo sigue ofreciendo. */
export const canStopOffering = (service: Pick<OfferableService, 'offeredByMe' | 'otherEmployees'>) =>
    service.offeredByMe && service.otherEmployees.length > 0;
