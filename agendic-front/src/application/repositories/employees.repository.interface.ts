import type {
    BranchCancelledBooking,
    ConfirmedEmployeeBranches,
    CreateEmployee,
    Employee,
    EmployeeBranches,
    Invitation,
    MyInvitation,
} from '@/src/entities/models/employee';
import type { CancelledBookings } from '@/src/entities/models/left-outside-booking';

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
    /**
     * Los Turnos que cambiar las Sucursales del Empleado cancelaría, ordenados por inicio. No guarda nada.
     *
     * @throws {BranchesRequiredError} `branchIds` vino vacío (400)
     * @throws {BranchNotOfBusinessError} una Sucursal no es del Negocio (422)
     * @throws {OwnerWorksAtEveryBranchError} al Empleado del Dueño se le saca una Sucursal (422)
     * @throws {LastEmployeeError} un Servicio se queda sin Empleados (422)
     * @throws {NotFoundError} el Empleado no existe o está dado de baja (404)
     * @throws {ApiRequestError} no es el Dueño (403) u otro error de la API
     */
    previewEmployeeBranches(input: EmployeeBranches): Promise<BranchCancelledBooking[]>;
    /**
     * Cambia las Sucursales del Empleado y cancela los Turnos de `cancelBookingIds`.
     *
     * @returns cuántos Turnos canceló
     * @throws {EmployeeBranchesBookingsChangedError} se cancelaría un Turno que no está en `cancelBookingIds` (409)
     * @throws los mismos errores que `previewEmployeeBranches`
     */
    changeEmployeeBranches(input: ConfirmedEmployeeBranches): Promise<CancelledBookings>;
}
