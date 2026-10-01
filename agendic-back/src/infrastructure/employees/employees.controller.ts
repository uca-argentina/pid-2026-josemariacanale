import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ListMyBookingsUseCase } from '../../application/bookings/list-my-bookings.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { InviteEmployeeUseCase } from '../../application/invitations/invite-employee.use-case';
import { ListInvitationsByBusinessUseCase } from '../../application/invitations/list-invitations-by-business.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentInvitation } from '../invitations/invitation.presenter';
import { presentEmployeeBooking } from '../bookings/booking.presenter';
import { presentEmployee } from './employee.presenter';
import { CreateEmployeeDto } from './employees.dto';

@Controller()
export class EmployeesController {
  constructor(
    private readonly inviteEmployeeUseCase: InviteEmployeeUseCase,
    private readonly listInvitationsByBusinessUseCase: ListInvitationsByBusinessUseCase,
    private readonly listEmployeesByBusinessUseCase: ListEmployeesByBusinessUseCase,
    private readonly retireEmployeeUseCase: RetireEmployeeUseCase,
    private readonly listMyBookingsUseCase: ListMyBookingsUseCase,
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

  @Delete('employees/:id')
  @UseGuards(ClerkGuard)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.retireEmployeeUseCase.execute(userId, id);
  }

  /** Mis turnos: los Turnos del Usuario como Empleado activo, en todos sus Negocios. */
  @Get('employees/me/bookings')
  @UseGuards(ClerkGuard)
  async listMyBookings(@CurrentUser() userId: number) {
    return (await this.listMyBookingsUseCase.execute(userId)).map(
      presentEmployeeBooking,
    );
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
