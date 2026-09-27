import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateAvailabilityUseCase } from '../../application/availabilities/create-availability.use-case';
import { DeleteAvailabilityUseCase } from '../../application/availabilities/delete-availability.use-case';
import { ListAvailabilitiesByEmployeeUseCase } from '../../application/availabilities/list-availabilities-by-employee.use-case';
import { MakeDefaultAvailabilityUseCase } from '../../application/availabilities/make-default-availability.use-case';
import { UpdateAvailabilityUseCase } from '../../application/availabilities/update-availability.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from './availabilities.dto';
import { presentAvailability } from './availability.presenter';

@Controller()
export class AvailabilitiesController {
  constructor(
    private readonly listAvailabilitiesByEmployeeUseCase: ListAvailabilitiesByEmployeeUseCase,
    private readonly createAvailabilityUseCase: CreateAvailabilityUseCase,
    private readonly updateAvailabilityUseCase: UpdateAvailabilityUseCase,
    private readonly makeDefaultAvailabilityUseCase: MakeDefaultAvailabilityUseCase,
    private readonly deleteAvailabilityUseCase: DeleteAvailabilityUseCase,
  ) {}

  @Get('employees/:id/availabilities')
  @UseGuards(ClerkGuard)
  async list(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) employeeId: number,
  ) {
    return (
      await this.listAvailabilitiesByEmployeeUseCase.execute(userId, employeeId)
    ).map(presentAvailability);
  }

  @Post('employees/:id/availabilities')
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) employeeId: number,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return presentAvailability(
      await this.createAvailabilityUseCase.execute(userId, employeeId, dto),
    );
  }

  @Patch('availabilities/:id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return presentAvailability(
      await this.updateAvailabilityUseCase.execute(userId, id, dto),
    );
  }

  @Post('availabilities/:id/default')
  @UseGuards(ClerkGuard)
  @HttpCode(200)
  async makeDefault(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentAvailability(
      await this.makeDefaultAvailabilityUseCase.execute(userId, id),
    );
  }

  @Delete('availabilities/:id')
  @UseGuards(ClerkGuard)
  @HttpCode(204)
  async delete(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.deleteAvailabilityUseCase.execute(userId, id);
  }
}
