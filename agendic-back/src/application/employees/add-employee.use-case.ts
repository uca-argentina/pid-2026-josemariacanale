import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { assertOwner } from '../businesses/assert-owner';

export interface AddEmployeeInput {
  name: string;
  email: string;
}

@Injectable()
export class AddEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
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
    return this.employees.create({ businessId, ...input });
  }
}
