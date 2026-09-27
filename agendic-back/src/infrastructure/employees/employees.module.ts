import { Module } from '@nestjs/common';
import { AddEmployeeUseCase } from '../../application/employees/add-employee.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { UsersModule } from '../users/users.module';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [UsersModule],
  controllers: [EmployeesController],
  providers: [
    AddEmployeeUseCase,
    ListEmployeesByBusinessUseCase,
    RetireEmployeeUseCase,
  ],
})
export class EmployeesModule {}
