/** Lo que Ofrecer necesita saber de un Servicio: quiénes lo atienden. */
export interface OfferableService {
    id: number;
    name: string;
    employees: { id: number; name: string }[];
}

/** Si el Empleado atiende el Servicio. */
export const offersIt = (service: OfferableService, employeeId: number) => service.employees.some((e) => e.id === employeeId);

/** Los nombres de los demás Empleados que atienden el Servicio. */
export const othersAttending = (service: OfferableService, employeeId: number) =>
    service.employees.filter((e) => e.id !== employeeId).map((e) => e.name);

/** Un Servicio no puede quedar sin nadie que lo atienda: un Empleado solo lo deja si otro lo sigue ofreciendo. */
export const canStopOffering = (service: OfferableService, employeeId: number) =>
    offersIt(service, employeeId) && othersAttending(service, employeeId).length > 0;
