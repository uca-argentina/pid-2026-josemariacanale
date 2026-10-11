import { Module } from '@nestjs/common';
import { GetHolidaysForCountryUseCase } from '../../application/holidays/get-holidays-for-country.use-case';
import { ListHolidayCountriesUseCase } from '../../application/holidays/list-holiday-countries.use-case';
import { UsersModule } from '../users/users.module';
import { HolidaysController } from './holidays.controller';

@Module({
  imports: [UsersModule],
  controllers: [HolidaysController],
  providers: [ListHolidayCountriesUseCase, GetHolidaysForCountryUseCase],
})
export class HolidaysModule {}
