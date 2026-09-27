import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DeleteOverridesUseCase } from '../../application/availability-overrides/delete-overrides.use-case';
import { ListOverridesByEmployeeUseCase } from '../../application/availability-overrides/list-overrides-by-employee.use-case';
import { ReplaceOverridesUseCase } from '../../application/availability-overrides/replace-overrides.use-case';
import { ParseDatePipe } from '../parse-date.pipe';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentOverride } from './availability-override.presenter';
import { ReplaceOverridesDto } from './availability-overrides.dto';

@Controller()
export class AvailabilityOverridesController {
  constructor(
    private readonly listOverridesByEmployeeUseCase: ListOverridesByEmployeeUseCase,
    private readonly replaceOverridesUseCase: ReplaceOverridesUseCase,
    private readonly deleteOverridesUseCase: DeleteOverridesUseCase,
  ) {}

  @Get('employees/:id/overrides')
  @UseGuards(ClerkGuard)
  async list(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) employeeId: number,
  ) {
    return (
      await this.listOverridesByEmployeeUseCase.execute(userId, employeeId)
    ).map(presentOverride);
  }

  @Put('employees/:id/overrides/:date')
  @UseGuards(ClerkGuard)
  async replace(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) employeeId: number,
    @Param('date', ParseDatePipe) date: string,
    @Body() dto: ReplaceOverridesDto,
  ) {
    return presentOverride(
      await this.replaceOverridesUseCase.execute(userId, employeeId, date, {
        intervals: dto.intervals,
        coveredByEmployeeId: dto.coveredByEmployeeId ?? null,
      }),
    );
  }

  @Delete('employees/:id/overrides/:date')
  @UseGuards(ClerkGuard)
  @HttpCode(204)
  async delete(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) employeeId: number,
    @Param('date', ParseDatePipe) date: string,
  ) {
    await this.deleteOverridesUseCase.execute(userId, employeeId, date);
  }
}
