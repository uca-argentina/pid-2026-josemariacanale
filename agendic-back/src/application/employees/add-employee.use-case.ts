import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { assertOwner } from '../businesses/assert-owner';

export interface AddEmployeeInput {
  email: string;
}

@Injectable()
export class AddEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    input: AddEmployeeInput,
  ): Promise<Employee> {
    const business = await this.businesses.findById(businessId);
    assertOwner(business, userId);
    const user = await this.users.findByEmail(input.email);
    if (!user)
      throw new BusinessRuleError(
        'Esa persona todavía no tiene cuenta en Agendic. Tiene que registrarse.',
      );
    return this.employees.create({
      userId: user.id,
      businessId,
      availability: DEFAULT_AVAILABILITY,
    });
  }
}
