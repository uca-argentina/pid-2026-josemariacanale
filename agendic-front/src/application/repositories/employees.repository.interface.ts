import type { CreateEmployee, Employee, Invitation, MyInvitation } from '@/src/entities/models/employee';

// "Only the Dueño" is enforced by the back: anyone else gets ApiRequestError (403).
export interface IEmployeesRepository {
    // The Empleados of the Negocio that are not dados de baja.
    listEmployees(businessId: number): Promise<Employee[]>;
    // Creates an Invitación (the Usuario is not an Empleado until they accept). Throws AlreadyEmployeeError (422).
    addEmployee(input: CreateEmployee): Promise<Invitation>;
    // The pending Invitaciones of the Negocio.
    listInvitations(businessId: number): Promise<Invitation[]>;
    // Throws LastEmployeeError (422) when they are the last Empleado of a Servicio.
    retireEmployee(employeeId: number): Promise<void>;
    /** Las Invitaciones pendientes dirigidas al Usuario. */
    listMyInvitations(): Promise<MyInvitation[]>;
    /**
     * Aceptar invitación: el Usuario pasa a ser Empleado.
     *
     * @throws {InvitationNotAcceptableError} la Invitación venció o ya es Empleado (422)
     * @throws {ApiRequestError} la Invitación no es suya (404) u otro error de la API
     */
    acceptInvitation(invitationId: number): Promise<void>;
    /**
     * Rechaza la Invitación; deja de estar pendiente.
     *
     * @throws {ApiRequestError} la Invitación no es suya (404) u otro error de la API
     */
    rejectInvitation(invitationId: number): Promise<void>;
    /**
     * Reenvía la Invitación pendiente y renueva su vencimiento.
     *
     * @throws {InvitationNotPendingError} ya se aceptó o rechazó (422)
     * @throws {ApiRequestError} no existe o no es del Negocio (404) u otro error de la API
     */
    resendInvitation(invitationId: number): Promise<Invitation>;
    /**
     * Cancela la Invitación pendiente.
     *
     * @throws {InvitationNotPendingError} ya se aceptó o rechazó (422)
     * @throws {ApiRequestError} no existe o no es del Negocio (404) u otro error de la API
     */
    cancelInvitation(invitationId: number): Promise<void>;
}
