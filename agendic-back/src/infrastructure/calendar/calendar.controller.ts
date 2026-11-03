import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DisconnectCalendarUseCase } from '../../application/calendar/disconnect-calendar.use-case';
import { GetCalendarConnectionUseCase } from '../../application/calendar/get-calendar-connection.use-case';
import { StartGoogleCalendarConnectionUseCase } from '../../application/calendar/start-google-calendar-connection.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';

/** El Calendario conectado del propio Usuario (ADR 0036). 503 sin credenciales OAuth de Google. */
@Controller('users/me/calendar')
@UseGuards(ClerkGuard)
export class CalendarController {
  constructor(
    private readonly getConnection: GetCalendarConnectionUseCase,
    private readonly startGoogle: StartGoogleCalendarConnectionUseCase,
    private readonly disconnect: DisconnectCalendarUseCase,
  ) {}

  /** El Calendario conectado, o `{ connection: null }`. */
  @Get()
  async get(@CurrentUser() userId: number) {
    return { connection: await this.getConnection.execute(userId) };
  }

  /**
   * @throws {ConflictError} ya tiene un Calendario conectado `CONNECTED` (409)
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google (503)
   */
  @Post('google')
  @HttpCode(200)
  start(@CurrentUser() userId: number) {
    return this.startGoogle.execute(userId);
  }

  /** @throws {NotFoundError} no tiene un Calendario conectado (404) */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() userId: number) {
    await this.disconnect.execute(userId);
  }
}
