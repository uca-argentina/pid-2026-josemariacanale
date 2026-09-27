import type { CreateEmployee, Employee } from '@/src/entities/models/employee';

// "Only the Dueño" is enforced by the back: anyone else gets ApiRequestError (403).
export interface IEmployeesRepository {
    // The Empleados of the Negocio that are not dados de baja.
    listEmployees(businessId: number): Promise<Employee[]>;
    addEmployee(input: CreateEmployee): Promise<Employee>;
    // Throws LastEmployeeError (422) when they are the last Empleado of a Servicio.
    retireEmployee(employeeId: number): Promise<void>;
}
