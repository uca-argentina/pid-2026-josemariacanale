import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CalendarProvider } from '../../domain/calendar/calendar-connection';
import { CompleteCalendarConnectionUseCase } from '../../application/calendar/complete-calendar-connection.use-case';
import { readSharedCalendarConfig } from './calendar-oauth-config';

/** Los callbacks de Google y de Microsoft (ADR 0036): sin Sesión, identifican al Usuario por el `state` y vuelven al front. */
@Controller('calendar-oauth')
export class CalendarOauthController {
  constructor(private readonly complete: CompleteCalendarConnectionUseCase) {}

  /** El callback de Google. */
  @Get('google/callback')
  google(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Res() res: Response,
  ) {
    return this.callback('GOOGLE', code, state, error, res);
  }

  /** El callback de Microsoft. */
  @Get('microsoft/callback')
  microsoft(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Res() res: Response,
  ) {
    return this.callback('MICROSOFT', code, state, error, res);
  }

  /**
   * Responde 302 a la pantalla del front con `?calendar=<resultado>`.
   *
   * Lee los parámetros uno por uno y no con un DTO: el proveedor suma los suyos (`scope`, `authuser`, `prompt`,
   * `session_state`) y la validación global rechazaría los que no conoce.
   */
  private async callback(
    provider: CalendarProvider,
    code: unknown,
    state: unknown,
    error: unknown,
    res: Response,
  ) {
    const result = await this.complete.execute(provider, {
      code: asText(code),
      state: asText(state),
      error: asText(error),
    });
    const target = new URL(readSharedCalendarConfig().returnUrl);
    target.searchParams.set('calendar', result);
    res.redirect(302, target.toString());
  }
}

const asText = (value: unknown) =>
  typeof value === 'string' ? value : undefined;
