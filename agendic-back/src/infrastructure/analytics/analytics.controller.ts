import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetPersonalAnalyticsUseCase } from '../../application/analytics/get-personal-analytics.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';

/** Analíticas del Usuario de la Sesión. */
@Controller('analytics')
@UseGuards(ClerkGuard)
export class AnalyticsController {
  constructor(
    private readonly getPersonalAnalyticsUseCase: GetPersonalAnalyticsUseCase,
  ) {}

  /** KPIs de los Servicios personales del Usuario en `from`..`to` (YYYY-MM-DD), con el período anterior. */
  @Get('personal')
  personal(
    @CurrentUser() userId: number,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('serviceId', new ParseIntPipe({ optional: true }))
    serviceId?: number,
  ) {
    return this.getPersonalAnalyticsUseCase.execute(
      userId,
      from,
      to,
      serviceId,
    );
  }
}
