import { Module } from '@nestjs/common';
import { GetHolidaysForCountryUseCase } from '../../application/holidays/get-holidays-for-country.use-case';
import { GetUserHolidaysUseCase } from '../../application/holidays/get-user-holidays.use-case';
import { ListHolidayConflictsUseCase } from '../../application/holidays/list-holiday-conflicts.use-case';
import { ListHolidayCountriesUseCase } from '../../application/holidays/list-holiday-countries.use-case';
import { SetUserHolidayCountryUseCase } from '../../application/holidays/set-user-holiday-country.use-case';
import { ToggleUserHolidayUseCase } from '../../application/holidays/toggle-user-holiday.use-case';
import { UsersModule } from '../users/users.module';
import { HolidaysController } from './holidays.controller';
import { UserHolidaysController } from './user-holidays.controller';

@Module({
  imports: [UsersModule],
  controllers: [HolidaysController, UserHolidaysController],
  providers: [
    ListHolidayCountriesUseCase,
    GetHolidaysForCountryUseCase,
    GetUserHolidaysUseCase,
    SetUserHolidayCountryUseCase,
    ToggleUserHolidayUseCase,
    ListHolidayConflictsUseCase,
  ],
})
export class HolidaysModule {}
