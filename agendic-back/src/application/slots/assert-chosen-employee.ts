import { BadRequestError, NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';

/**
 * Comprueba que `employeeId` pueda ser el Empleado elegido de `service`: un Servicio del Negocio que ese Empleado
 * Ofrece hoy y del que no fue dado de baja.
 *
 * @throws {BadRequestError} el Servicio es personal, no tiene Empleados
 * @throws {NotFoundError} el Empleado no Ofrece el Servicio
 */
export function assertChosenEmployee(service: Service, employeeId: number): void {
  if (service.userId !== null)
    throw new BadRequestError(
      `Service ${service.id} is personal: it has no Employees to choose`,
    );
  if (!service.employees.some(({ id }) => id === employeeId))
    throw new NotFoundError(
      `Employee ${employeeId} does not offer Service ${service.id}`,
    );
}
