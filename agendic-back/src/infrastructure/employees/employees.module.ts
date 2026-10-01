import { Module } from '@nestjs/common';
import { ListMyBookingsUseCase } from '../../application/bookings/list-my-bookings.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { InviteEmployeeUseCase } from '../../application/invitations/invite-employee.use-case';
import { ListInvitationsByBusinessUseCase } from '../../application/invitations/list-invitations-by-business.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { UsersModule } from '../users/users.module';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [UsersModule],
  controllers: [EmployeesController],
  providers: [
    InviteEmployeeUseCase,
    ListInvitationsByBusinessUseCase,
    ListEmployeesByBusinessUseCase,
    RetireEmployeeUseCase,
    ListMyBookingsUseCase,
  ],
})
export class EmployeesModule {}
