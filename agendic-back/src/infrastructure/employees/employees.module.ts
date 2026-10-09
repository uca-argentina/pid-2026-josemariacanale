import { Module } from '@nestjs/common';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { InviteEmployeeUseCase } from '../../application/invitations/invite-employee.use-case';
import { ListInvitationsByBusinessUseCase } from '../../application/invitations/list-invitations-by-business.use-case';
import { ListMyInvitationsUseCase } from '../../application/invitations/list-my-invitations.use-case';
import { ManageInvitationUseCase } from '../../application/invitations/manage-invitation.use-case';
import { RespondToInvitationUseCase } from '../../application/invitations/respond-to-invitation.use-case';
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
    ListMyInvitationsUseCase,
    RespondToInvitationUseCase,
    ManageInvitationUseCase,
    RetireEmployeeUseCase,
  ],
})
export class EmployeesModule {}
