import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { GetUserHolidaysUseCase } from '../../application/holidays/get-user-holidays.use-case';
import { ListHolidayConflictsUseCase } from '../../application/holidays/list-holiday-conflicts.use-case';
import { SetUserHolidayCountryUseCase } from '../../application/holidays/set-user-holiday-country.use-case';
import { ToggleUserHolidayUseCase } from '../../application/holidays/toggle-user-holiday.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { SetHolidayCountryDto, ToggleHolidayDto } from './user-holidays.dto';

/** Días festivos del propio Usuario y sus conflictos con Turnos (ADR 0027). 503 sin `GOOGLE_CALENDAR_API_KEY`. */
@Controller('users/me/holidays')
@UseGuards(ClerkGuard)
export class UserHolidaysController {
  constructor(
    private readonly getUserHolidays: GetUserHolidaysUseCase,
    private readonly setCountry: SetUserHolidayCountryUseCase,
    private readonly toggleHoliday: ToggleUserHolidayUseCase,
    private readonly listConflicts: ListHolidayConflictsUseCase,
  ) {}

  @Get()
  list(@CurrentUser() userId: number) {
    return this.getUserHolidays.execute(userId);
  }

  @Put()
  put(@CurrentUser() userId: number, @Body() dto: SetHolidayCountryDto) {
    return this.setCountry.execute(userId, dto.countryCode);
  }

  @Get('conflicts')
  conflicts(@CurrentUser() userId: number) {
    return this.listConflicts.execute(userId);
  }

  @Patch(':holidayId')
  toggle(
    @CurrentUser() userId: number,
    @Param('holidayId') holidayId: string,
    @Body() dto: ToggleHolidayDto,
  ) {
    return this.toggleHoliday.execute(userId, holidayId, dto.enabled);
  }
}
