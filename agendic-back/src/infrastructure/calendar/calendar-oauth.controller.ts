import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CompleteGoogleCalendarConnectionUseCase } from '../../application/calendar/complete-google-calendar-connection.use-case';
import { readCalendarOauthConfig } from './calendar-oauth-config';

/** El callback de Google (ADR 0036): sin Sesión, identifica al Usuario por el `state` y vuelve al front. */
@Controller('calendar-oauth/google')
export class CalendarOauthController {
  constructor(
    private readonly complete: CompleteGoogleCalendarConnectionUseCase,
  ) {}

  /**
   * Responde 302 a la pantalla del front con `?calendar=<resultado>`.
   *
   * Lee los parámetros uno por uno y no con un DTO: Google suma los suyos (`scope`, `authuser`, `prompt`) y la
   * validación global rechazaría los que no conoce.
   */
  @Get('callback')
  async callback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Res() res: Response,
  ) {
    const result = await this.complete.execute({
      code: asText(code),
      state: asText(state),
      error: asText(error),
    });
    const target = new URL(readCalendarOauthConfig().returnUrl);
    target.searchParams.set('calendar', result);
    res.redirect(302, target.toString());
  }
}

const asText = (value: unknown) =>
  typeof value === 'string' ? value : undefined;
