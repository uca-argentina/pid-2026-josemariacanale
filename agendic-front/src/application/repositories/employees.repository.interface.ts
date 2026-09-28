import type { CreateEmployee, Employee } from '@/src/entities/models/employee';

// "Only the Dueño" is enforced by the back: anyone else gets ApiRequestError (403).
export interface IEmployeesRepository {
    // The Empleados of the Negocio that are not dados de baja.
    listEmployees(businessId: number): Promise<Employee[]>;
    // Throws EmployeeAlreadyExistsError (409) if already an Employee, UserNotRegisteredError (422) if user not found.
    addEmployee(input: CreateEmployee): Promise<Employee>;
    // Throws LastEmployeeError (422) when they are the last Empleado of a Servicio, or CannotRetireOwnerError (422) if trying to retire the owner.
    retireEmployee(employeeId: number): Promise<void>;
}
