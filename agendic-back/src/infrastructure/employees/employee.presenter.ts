import { Employee } from '../../domain/employees/employee';

/**
 * The Dueño's view. `userId` lets the front recognize the Dueño by comparing it to the Business's `ownerId`.
 * The public one, on a Servicio, is `{ id, name }` and lives in the Servicio presenter.
 */
export const presentEmployee = (employee: Employee) => ({
  id: employee.id,
  userId: employee.userId,
  name: employee.name,
  email: employee.email,
  imageUrl: employee.imageUrl,
});
