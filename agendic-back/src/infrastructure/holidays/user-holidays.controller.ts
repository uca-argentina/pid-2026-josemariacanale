import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { GetUserHolidaysUseCase } from '../../application/holidays/get-user-holidays.use-case';
import { ListHolidayConflictsUseCase } from '../../application/holidays/list-holiday-conflicts.use-case';
import { SetUserHolidayCountryUseCase } from '../../application/holidays/set-user-holiday-country.use-case';
import { ToggleUserHolidayUseCase } from '../../application/holidays/toggle-user-holiday.use-case';
import { presentLeftOutside } from '../out-of-office/out-of-office.presenter';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import {
  ConfirmedHolidayCountryDto,
  ConfirmedToggleHolidayDto,
  SetHolidayCountryDto,
  ToggleHolidayDto,
} from './user-holidays.dto';

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

  /** Los Turnos que elegir el país dejaría afuera; no guarda nada. */
  @Post('preview')
  @HttpCode(200)
  async previewPut(
    @CurrentUser() userId: number,
    @Body() dto: SetHolidayCountryDto,
  ) {
    return (await this.setCountry.preview(userId, dto.countryCode)).map(
      presentLeftOutside,
    );
  }

  /** Guarda el país y cancela los Turnos que deja afuera, los que el Usuario confirmó. */
  @Put()
  put(@CurrentUser() userId: number, @Body() dto: ConfirmedHolidayCountryDto) {
    return this.setCountry.execute(userId, dto.countryCode, dto.cancelBookingIds);
  }

  @Get('conflicts')
  conflicts(@CurrentUser() userId: number) {
    return this.listConflicts.execute(userId);
  }

  /** Los Turnos que prender el Día festivo dejaría afuera; no guarda nada. */
  @Post(':holidayId/preview')
  @HttpCode(200)
  async previewPatch(
    @CurrentUser() userId: number,
    @Param('holidayId') holidayId: string,
    @Body() dto: ToggleHolidayDto,
  ) {
    return (await this.toggleHoliday.preview(userId, holidayId, dto.enabled)).map(
      presentLeftOutside,
    );
  }

  /** Apaga o prende el Día festivo; al prenderlo cancela los Turnos que deja afuera, los que el Usuario confirmó. */
  @Patch(':holidayId')
  toggle(
    @CurrentUser() userId: number,
    @Param('holidayId') holidayId: string,
    @Body() dto: ConfirmedToggleHolidayDto,
  ) {
    return this.toggleHoliday.execute(
      userId,
      holidayId,
      dto.enabled,
      dto.cancelBookingIds,
    );
  }
}
