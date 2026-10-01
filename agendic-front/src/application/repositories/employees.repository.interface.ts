import type { CreateEmployee, Employee, Invitation, MyInvitation } from '@/src/entities/models/employee';

// "Only the DueÃ±o" is enforced by the back: anyone else gets ApiRequestError (403).
export interface IEmployeesRepository {
    // The Empleados of the Negocio that are not dados de baja.
    listEmployees(businessId: number): Promise<Employee[]>;
    // Creates an InvitaciÃ³n (the Usuario is not an Empleado until they accept). Throws AlreadyEmployeeError (422).
    addEmployee(input: CreateEmployee): Promise<Invitation>;
    // The pending Invitaciones of the Negocio.
    listInvitations(businessId: number): Promise<Invitation[]>;
    // Throws LastEmployeeError (422) when they are the last Empleado of a Servicio.
    retireEmployee(employeeId: number): Promise<void>;
    // The pending Invitaciones addressed to the Usuario.
    listMyInvitations(): Promise<MyInvitation[]>;
    // Aceptar invitación: the Usuario becomes Empleado. Throws InvitationNotAcceptableError (422) when it expired or they already are one.
    acceptInvitation(invitationId: number): Promise<void>;
    // Rechazar la Invitación; it stops being pending.
    rejectInvitation(invitationId: number): Promise<void>;
}
