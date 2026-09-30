import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ListMyBookingsUseCase } from '../../application/bookings/list-my-bookings.use-case';
import { AddEmployeeUseCase } from '../../application/employees/add-employee.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentEmployeeBooking } from '../bookings/booking.presenter';
import { presentEmployee } from './employee.presenter';
import { CreateEmployeeDto } from './employees.dto';

@Controller()
export class EmployeesController {
  constructor(
    private readonly addEmployeeUseCase: AddEmployeeUseCase,
    private readonly listEmployeesByBusinessUseCase: ListEmployeesByBusinessUseCase,
    private readonly retireEmployeeUseCase: RetireEmployeeUseCase,
    private readonly listMyBookingsUseCase: ListMyBookingsUseCase,
  ) {}

  @Post('businesses/:id/employees')
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: CreateEmployeeDto,
  ) {
    return presentEmployee(
      await this.addEmployeeUseCase.execute(userId, businessId, dto),
    );
  }

  @Delete('employees/:id')
  @UseGuards(ClerkGuard)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.retireEmployeeUseCase.execute(userId, id);
  }

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
