import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DisconnectCalendarUseCase } from '../../application/calendar/disconnect-calendar.use-case';
import { GetCalendarConnectionUseCase } from '../../application/calendar/get-calendar-connection.use-case';
import { ListCalendarsUseCase } from '../../application/calendar/list-calendars.use-case';
import { SetCheckedCalendarsUseCase } from '../../application/calendar/set-checked-calendars.use-case';
import { StartCalendarConnectionUseCase } from '../../application/calendar/start-calendar-connection.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { SetCheckedCalendarsDto } from './calendar.dto';

/** El Calendario conectado del propio Usuario (ADR 0036), de Google o de Microsoft. 503 sin las credenciales OAuth del proveedor. */
@Controller('users/me/calendar')
@UseGuards(ClerkGuard)
export class CalendarController {
  constructor(
    private readonly getConnection: GetCalendarConnectionUseCase,
    private readonly start: StartCalendarConnectionUseCase,
    private readonly disconnect: DisconnectCalendarUseCase,
    private readonly listCalendars: ListCalendarsUseCase,
    private readonly setChecked: SetCheckedCalendarsUseCase,
  ) {}

  /** El Calendario conectado, o `{ connection: null }`. */
  @Get()
  async get(@CurrentUser() userId: number) {
    return { connection: await this.getConnection.execute(userId) };
  }

  /**
   * @throws {ConflictError} ya tiene un Calendario conectado `CONNECTED`, de cualquier proveedor (409)
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google (503)
   */
  @Post('google')
  @HttpCode(200)
  startGoogle(@CurrentUser() userId: number) {
    return this.start.execute(userId, 'GOOGLE');
  }

  /**
   * @throws {ConflictError} ya tiene un Calendario conectado `CONNECTED`, de cualquier proveedor (409)
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft (503)
   */
  @Post('microsoft')
  @HttpCode(200)
  startMicrosoft(@CurrentUser() userId: number) {
    return this.start.execute(userId, 'MICROSOFT');
  }

  /**
   * Los calendarios de la cuenta y cuáles cuentan como Ocupado externo.
   *
   * @throws {NotFoundError} no tiene un Calendario conectado (404)
   * @throws {ConflictError} el Calendario conectado está `DISCONNECTED` (409)
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió (502)
   */
  @Get('calendars')
  calendars(@CurrentUser() userId: number) {
    return this.listCalendars.execute(userId);
  }

  /**
   * Guarda cuáles calendarios cuentan como Ocupado externo.
   *
   * @throws {NotFoundError} no tiene un Calendario conectado (404)
   * @throws {ConflictError} el Calendario conectado está `DISCONNECTED` (409)
   * @throws {BusinessRuleError} un id no es de la cuenta conectada (422)
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió (502)
   */
  @Put('calendars')
  saveCalendars(
    @CurrentUser() userId: number,
    @Body() body: SetCheckedCalendarsDto,
  ) {
    return this.setChecked.execute(userId, body.checkedIds);
  }

  /** @throws {NotFoundError} no tiene un Calendario conectado (404) */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() userId: number) {
    await this.disconnect.execute(userId);
  }
}
