import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListHolidayCountriesUseCase } from '../../application/holidays/list-holiday-countries.use-case';
import { ClerkGuard } from '../users/clerk.guard';

/** Catálogo de Días festivos (ADR 0027). */
@Controller('holidays')
@UseGuards(ClerkGuard)
export class HolidaysController {
  constructor(private readonly listCountries: ListHolidayCountriesUseCase) {}

  /** Con Sesión: los cinco calendarios religiosos y después los países, como `[{ code, name }]`. 503 sin `GOOGLE_CALENDAR_API_KEY`. */
  @Get('countries')
  countries() {
    return this.listCountries.execute();
  }
}
