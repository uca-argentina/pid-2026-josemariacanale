import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { InviteEmployeeUseCase } from '../../application/invitations/invite-employee.use-case';
import { ListInvitationsByBusinessUseCase } from '../../application/invitations/list-invitations-by-business.use-case';
import { ListMyInvitationsUseCase } from '../../application/invitations/list-my-invitations.use-case';
import { ManageInvitationUseCase } from '../../application/invitations/manage-invitation.use-case';
import { RespondToInvitationUseCase } from '../../application/invitations/respond-to-invitation.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentInvitation } from '../invitations/invitation.presenter';
import {
  presentBranchChangeBooking,
  presentEmployee,
} from './employee.presenter';
import { ChangeEmployeeBranchesUseCase } from '../../application/employees/change-employee-branches.use-case';
import { PreviewEmployeeBranchesUseCase } from '../../application/employees/preview-employee-branches.use-case';
import {
  ConfirmedEmployeeBranchesDto,
  CreateEmployeeDto,
  EmployeeBranchesDto,
} from './employees.dto';

@Controller()
export class EmployeesController {
  constructor(
    private readonly inviteEmployeeUseCase: InviteEmployeeUseCase,
    private readonly listInvitationsByBusinessUseCase: ListInvitationsByBusinessUseCase,
    private readonly listEmployeesByBusinessUseCase: ListEmployeesByBusinessUseCase,
    private readonly listMyInvitationsUseCase: ListMyInvitationsUseCase,
    private readonly respondToInvitationUseCase: RespondToInvitationUseCase,
    private readonly manageInvitationUseCase: ManageInvitationUseCase,
    private readonly retireEmployeeUseCase: RetireEmployeeUseCase,
    private readonly previewEmployeeBranchesUseCase: PreviewEmployeeBranchesUseCase,
    private readonly changeEmployeeBranchesUseCase: ChangeEmployeeBranchesUseCase,
  ) {}

  @Post('businesses/:id/employees')
  @UseGuards(ClerkGuard)
  /** Invita a un email a ser Empleado (ADR 0019): 201 si crea la Invitaci�n, 200 si ya estaba pendiente. */
  async invite(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: CreateEmployeeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { invitation, created } = await this.inviteEmployeeUseCase.execute(
      userId,
      businessId,
      dto.email,
      dto.branchIds,
    );
    res.status(created ? 201 : 200);
    return presentInvitation(invitation);
  }

  @Get('businesses/:id/invitations')
  @UseGuards(ClerkGuard)
  async listInvitations(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listInvitationsByBusinessUseCase.execute(userId, businessId)
    ).map(presentInvitation);
  }

  /** Mis invitaciones: las pendientes y no vencidas dirigidas al email del Usuario. */
  @Get('invitations/me')
  @UseGuards(ClerkGuard)
  async listMyInvitations(@CurrentUser() userId: number) {
    return (await this.listMyInvitationsUseCase.execute(userId)).map(
      ({ id, business, branches }) => ({ id, business, branches }),
    );
  }

  /** Acepta la Invitación: crea el Empleado del Negocio. */
  @Post('invitations/:id/accept')
  @HttpCode(200)
  @UseGuards(ClerkGuard)
  async acceptInvitation(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentEmployee(
      await this.respondToInvitationUseCase.accept(userId, id),
    );
  }

  /** Rechaza la Invitación: la cierra sin crear Empleado. */
  @Post('invitations/:id/reject')
  @HttpCode(204)
  @UseGuards(ClerkGuard)
  async rejectInvitation(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.respondToInvitationUseCase.reject(userId, id);
  }

  /** El Dueño reenvía la Invitación: renueva el vencimiento y reenvía el mail si corresponde. */
  @Post('invitations/:id/resend')
  @HttpCode(200)
  @UseGuards(ClerkGuard)
  async resendInvitation(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentInvitation(
      await this.manageInvitationUseCase.resend(userId, id),
    );
  }

  /** El Dueño cancela la Invitación pendiente. */
  @Delete('invitations/:id')
  @HttpCode(204)
  @UseGuards(ClerkGuard)
  async cancelInvitation(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.manageInvitationUseCase.cancel(userId, id);
  }

  @Delete('employees/:id')
  @UseGuards(ClerkGuard)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.retireEmployeeUseCase.execute(userId, id);
  }

  /** Los Turnos que cambiar las Sucursales del Empleado cancelaría; no guarda nada. */
  @Post('employees/:id/branches/preview')
  @HttpCode(200)
  @UseGuards(ClerkGuard)
  async previewBranches(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EmployeeBranchesDto,
  ) {
    return (
      await this.previewEmployeeBranchesUseCase.execute(
        userId,
        id,
        dto.branchIds,
      )
    ).map(presentBranchChangeBooking);
  }

  /** Cambia las Sucursales del Empleado y cancela los Turnos que el Dueño confirmó. */
  @Put('employees/:id/branches')
  @UseGuards(ClerkGuard)
  async changeBranches(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmedEmployeeBranchesDto,
  ) {
    const { employee, cancelledBookings } =
      await this.changeEmployeeBranchesUseCase.execute(
        userId,
        id,
        dto.branchIds,
        dto.cancelBookingIds,
      );
    return { ...presentEmployee(employee), cancelledBookings };
  }

  @Get('businesses/:id/employees')
  @UseGuards(ClerkGuard)
  async list(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listEmployeesByBusinessUseCase.execute(userId, businessId)
    ).map(presentEmployee);
  }
}
