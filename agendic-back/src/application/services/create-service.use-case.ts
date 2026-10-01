import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import { CreateServiceInput, Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { defaultAvailability } from '../availabilities/default-availability';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  async execute(
    userId: number,
    branchId: number,
    input: CreateServiceInput,
  ): Promise<Service> {
    const branch = await assertBranchOwner(
      this.branches,
      this.businesses,
      branchId,
      userId,
    );
    await this.assertCanAttend(branch.businessId, input.employeeIds);
    // Each Empleado enters with their default Availability.
    const employees = await Promise.all(
      [...new Set(input.employeeIds)].map(async (employeeId) => ({
        employeeId,
        availabilityId: (
          await defaultAvailability(this.availabilities, employeeId)
        ).id,
      })),
    );
    return this.services.create({
      branchId,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      durationMinutes: input.durationMinutes,
      price: input.price,
      depositPercent: input.depositPercent ?? null,
      requiresApproval: input.requiresApproval ?? false,
      slug: input.slug,
      hidden: input.hidden ?? false,
      prepMinutes: input.prepMinutes ?? 0,
      dailyLimit: input.dailyLimit ?? null,
      employees,
    });
  }

  /** Every Empleado belongs to this Negocio and isn't dado de baja. */
  private async assertCanAttend(businessId: number, employeeIds: number[]) {
    const found = await this.employees.listByIds(employeeIds);
    const eligible = found.filter(
      (employee) =>
        employee.businessId === businessId && employee.retiredAt === null,
    );
    if (eligible.length !== new Set(employeeIds).size)
      throw new BusinessRuleError(
        'Every employeeId must be an Employee of this Business who is not retired',
      );
  }
}
