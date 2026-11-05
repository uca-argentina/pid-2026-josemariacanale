import { Employee } from '../../domain/employees/employee';
import { BusinessRuleError } from '../../domain/errors';

/**
 * An Empleado only Ofrece the Servicios of the Sucursales where they trabajan (#386).
 *
 * @throws {BusinessRuleError} the Empleado does not work at that Sucursal
 */
export function assertWorksAt(
  employee: Pick<Employee, 'id' | 'branchIds'>,
  branchId: number,
): void {
  if (!employee.branchIds.includes(branchId))
    throw new BusinessRuleError(
      `Employee ${employee.id} does not work at Branch ${branchId}`,
    );
}
