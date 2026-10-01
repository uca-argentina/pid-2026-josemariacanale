import type { CreateEmployee, Employee, Invitation } from '@/src/entities/models/employee';

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
}
