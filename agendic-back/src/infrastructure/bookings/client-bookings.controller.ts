import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CancelClientBookingUseCase } from '../../application/bookings/cancel-client-booking.use-case';
import { ListClientBookingsUseCase } from '../../application/bookings/list-client-bookings.use-case';
import { RequestClientAccessUseCase } from '../../application/bookings/request-client-access.use-case';
import { RescheduleClientBookingUseCase } from '../../application/bookings/reschedule-client-booking.use-case';
import { ClientAccessGuard, ClientEmail } from './client-access.guard';
import { presentClientAccess, presentClientBooking } from './booking.presenter';
import { ClientAccessDto, RescheduleBookingDto } from './bookings.dto';

/** Mis turnos del Cliente (ADR 0022): sin cookie ni Sesión, con un acceso de 15 minutos atado a su email. */
@Controller()
export class ClientBookingsController {
  constructor(
    private readonly requestClientAccessUseCase: RequestClientAccessUseCase,
    private readonly listClientBookingsUseCase: ListClientBookingsUseCase,
    private readonly cancelClientBookingUseCase: CancelClientBookingUseCase,
    private readonly rescheduleClientBookingUseCase: RescheduleClientBookingUseCase,
  ) {}

  /**
   * Cambia un Código de verificación vigente por un acceso de 15 minutos a Mis turnos.
   *
   * @throws {InvalidCodeError} el código no es válido para email
   */
  @Post('client-access')
  @HttpCode(200)
  requestAccess(@Body() dto: ClientAccessDto) {
    return presentClientAccess(
      this.requestClientAccessUseCase.execute(dto.email, dto.code),
    );
  }

  @Get('client/bookings')
  @UseGuards(ClientAccessGuard)
  async list(@ClientEmail() email: string) {
    return (await this.listClientBookingsUseCase.execute(email)).map(
      presentClientBooking,
    );
  }

  /**
   * @throws {NotFoundError} el Turno no existe o no es de este email
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o ya empezó
   */
  @Patch('client/bookings/:id/cancel')
  @UseGuards(ClientAccessGuard)
  async cancel(
    @ClientEmail() email: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentClientBooking(
      await this.cancelClientBookingUseCase.execute(email, id),
    );
  }

  /**
   * @throws {NotFoundError} el Turno no existe o no es de este email
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o `startsAt` no es un Horario reservable
   * @throws {ConflictError} el horario nuevo pisa otro Turno del Empleado
   */
  @Patch('client/bookings/:id/reschedule')
  @UseGuards(ClientAccessGuard)
  async reschedule(
    @ClientEmail() email: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleBookingDto,
  ) {
    return presentClientBooking(
      await this.rescheduleClientBookingUseCase.execute(
        email,
        id,
        new Date(dto.startsAt),
      ),
    );
  }
}
