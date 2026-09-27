import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import { Availability } from '../../domain/availabilities/availability';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { NotFoundError } from '../../domain/errors';
import { assertEmployeeOwner } from '../employees/assert-employee-owner';

/** Throws NotFoundError for an unknown Availability, then ForbiddenError unless userId owns its Empleado's Business. */
export async function assertAvailabilityOwner(
  availabilities: AvailabilitiesRepository,
  employees: EmployeesRepository,
  businesses: BusinessesRepository,
  availabilityId: number,
  userId: number,
): Promise<Availability> {
  const availability = await availabilities.findById(availabilityId);
  if (!availability) throw new NotFoundError('Availability not found');
  await assertEmployeeOwner(
    employees,
    businesses,
    availability.employeeId,
    userId,
  );
  return availability;
}
