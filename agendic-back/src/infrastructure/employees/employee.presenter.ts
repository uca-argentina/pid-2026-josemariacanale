import { StaffMember } from '../../application/employees/list-employees-by-business.use-case';
import { Employee } from '../../domain/employees/employee';
import { BranchChangeBooking } from '../../domain/employees/employees.repository';

/**
 * The Dueño's view. `userId` lets the front recognize the Dueño by comparing it to the Business's `ownerId`;
 * `branchIds` are the Sucursales where they trabajan, ascending.
 * The public one, on a Servicio, is `{ id, name }` and lives in the Servicio presenter.
 */
export const presentEmployee = (employee: Employee) => ({
  id: employee.id,
  userId: employee.userId,
  name: employee.name,
  email: employee.email,
  imageUrl: employee.imageUrl,
  branchIds: employee.branchIds,
});

/** Un Turno que cambiar las Sucursales del Empleado cancelaría, como lo responde la vista previa (ADR 0007): sin datos de contacto del Cliente. */
export const presentBranchChangeBooking = ({
  id,
  startsAt,
  endsAt,
  timeZone,
  serviceName,
  clientName,
  branch,
}: BranchChangeBooking) => ({
  id,
  startsAt,
  endsAt,
  timeZone,
  serviceName,
  clientName,
  branch,
});

/** A member of the Staff as `GET /businesses/:id/employees` lists it: the Empleado plus the highest Nivel of each of their Insignias. */
export const presentStaffMember = ({ employee, badges }: StaffMember) => ({
  ...presentEmployee(employee),
  badges,
});
