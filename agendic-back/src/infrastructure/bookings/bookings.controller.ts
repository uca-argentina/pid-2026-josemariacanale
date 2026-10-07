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
import { CancelBookingUseCase } from '../../application/bookings/cancel-booking.use-case';
import { MarkNoShowUseCase } from '../../application/bookings/mark-no-show.use-case';
import { RescheduleBookingUseCase } from '../../application/bookings/reschedule-booking.use-case';
import { AcceptBookingUseCase } from '../../application/bookings/accept-booking.use-case';
import { RejectBookingUseCase } from '../../application/bookings/reject-booking.use-case';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { RequestBookingCodeUseCase } from '../../application/bookings/request-booking-code.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import {
  presentBooking,
  presentBookingForOwner,
  presentBookingWithNoShow,
} from './booking.presenter';
import {
  CreateBookingDto,
  RequestBookingCodeDto,
  RescheduleBookingDto,
} from './bookings.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly requestBookingCodeUseCase: RequestBookingCodeUseCase,
    private readonly listBookingsByBusinessUseCase: ListBookingsByBusinessUseCase,
    private readonly acceptBookingUseCase: AcceptBookingUseCase,
    private readonly rejectBookingUseCase: RejectBookingUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
    private readonly rescheduleBookingUseCase: RescheduleBookingUseCase,
    private readonly markNoShowUseCase: MarkNoShowUseCase,
  ) {}

  /**
   * Pide un Código de verificación para Reservar.
   *
   * @throws {TooManyRequestsError} ya se pidieron 5 códigos para ese email en los últimos 15 minutos
   */
  @Post('bookings/code')
  @HttpCode(204)
  async requestCode(@Body() dto: RequestBookingCodeDto) {
    await this.requestBookingCodeUseCase.execute(dto.email);
  }

  /**
   * Reserva un Turno con un Código de verificación ya vigente.
   *
   * @throws {InvalidCodeError} el código no es válido para clientEmail
   * @throws {BusinessRuleError} el Servicio no existe o está dado de baja, el horario ya pasó o no es un Horario reservable
   * @throws {ConflictError} el horario ya lo ocupa otro Turno, o el Servicio alcanzó su Límite diario ese día
   */
  @Post('bookings')
  async create(@Body() dto: CreateBookingDto) {
    const booking = await this.createBookingUseCase.execute({
      serviceId: dto.serviceId,
      startsAt: new Date(dto.startsAt),
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      notes: dto.notes,
      code: dto.code,
    });
    return { ...presentBooking(booking), employeeName: booking.employeeName };
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está pendiente
   */
  @Patch('bookings/:id/accept')
  @UseGuards(ClerkGuard)
  async accept(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentBooking(await this.acceptBookingUseCase.execute(userId, id));
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está pendiente
   */
  @Patch('bookings/:id/reject')
  @UseGuards(ClerkGuard)
  async reject(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentBooking(await this.rejectBookingUseCase.execute(userId, id));
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está aceptado
   */
  @Patch('bookings/:id/cancel')
  @UseGuards(ClerkGuard)
  async cancel(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentBooking(await this.cancelBookingUseCase.execute(userId, id));
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está aceptado o el horario no es reservable
   * @throws {ConflictError} el horario pisa otro Turno del Empleado
   */
  @Patch('bookings/:id/reschedule')
  @UseGuards(ClerkGuard)
  async reschedule(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleBookingDto,
  ) {
    return presentBooking(
      await this.rescheduleBookingUseCase.execute(
        userId,
        id,
        new Date(dto.startsAt),
      ),
    );
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está aceptado, no terminó o ya tiene Ausencia
   */
  @Patch('bookings/:id/no-show')
  @UseGuards(ClerkGuard)
  async noShow(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentBookingWithNoShow(
      await this.markNoShowUseCase.execute(userId, id),
    );
  }

  @Get('businesses/:id/bookings')
  @UseGuards(ClerkGuard)
  async listByBusiness(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listBookingsByBusinessUseCase.execute(userId, businessId)
    ).map(presentBookingForOwner);
  }
}
