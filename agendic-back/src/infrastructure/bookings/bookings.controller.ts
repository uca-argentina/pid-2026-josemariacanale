import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CancelBookingSeriesUseCase } from '../../application/bookings/cancel-booking-series.use-case';
import { ResolvePendingSeriesUseCase } from '../../application/bookings/resolve-pending-series.use-case';
import { CancelBookingUseCase } from '../../application/bookings/cancel-booking.use-case';
import { MarkNoShowUseCase } from '../../application/bookings/mark-no-show.use-case';
import { GetBookingHistoryUseCase } from '../../application/bookings/get-booking-history.use-case';
import { UnmarkNoShowUseCase } from '../../application/bookings/unmark-no-show.use-case';
import { RescheduleBookingUseCase } from '../../application/bookings/reschedule-booking.use-case';
import { AcceptBookingUseCase } from '../../application/bookings/accept-booking.use-case';
import { RejectBookingUseCase } from '../../application/bookings/reject-booking.use-case';
import { CreateBookingSeriesUseCase } from '../../application/bookings/create-booking-series.use-case';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListMyBookingsUseCase } from '../../application/bookings/list-my-bookings.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { RequestBookingCodeUseCase } from '../../application/bookings/request-booking-code.use-case';
import { BookingStatus } from '../../domain/bookings/booking';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import {
  presentBooking,
  presentBookingForOwner,
  presentBookingWithNoShow,
  presentPanelBooking,
  presentUserBooking,
} from './booking.presenter';
import {
  AcceptBookingDto,
  CancelBookingDto,
  CreateBookingDto,
  reasonOf,
  RejectBookingDto,
  RequestBookingCodeDto,
  RescheduleBookingDto,
} from './bookings.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly createBookingSeriesUseCase: CreateBookingSeriesUseCase,
    private readonly requestBookingCodeUseCase: RequestBookingCodeUseCase,
    private readonly listBookingsByBusinessUseCase: ListBookingsByBusinessUseCase,
    private readonly acceptBookingUseCase: AcceptBookingUseCase,
    private readonly rejectBookingUseCase: RejectBookingUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
    private readonly cancelBookingSeriesUseCase: CancelBookingSeriesUseCase,
    private readonly resolvePendingSeriesUseCase: ResolvePendingSeriesUseCase,
    private readonly rescheduleBookingUseCase: RescheduleBookingUseCase,
    private readonly markNoShowUseCase: MarkNoShowUseCase,
    private readonly unmarkNoShowUseCase: UnmarkNoShowUseCase,
    private readonly getBookingHistoryUseCase: GetBookingHistoryUseCase,
    private readonly listMyBookingsUseCase: ListMyBookingsUseCase,
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
   * Reserva un Turno con un Código de verificación ya vigente (ADR 0022).
   *
   * @throws {InvalidCodeError} el código no es válido para clientEmail
   * @throws {BusinessRuleError} el Servicio no existe o está dado de baja, el horario ya pasó o no es un Horario reservable (del Empleado elegido, si hay)
   * @throws {NotFoundError} el Empleado elegido no Ofrece el Servicio
   * @throws {BadRequestError} se eligió un Empleado en un Servicio personal
   * @throws {ConflictError} el horario ya lo ocupa otro Turno, o el Servicio alcanzó su Límite diario ese día; con `repeat`, `Series dates not available: <fechas>`
   * @throws {BadRequestError} con `repeat`, `count` fuera de rango o una fecha de `skipDates` que no es de la Serie
   * @throws {BusinessRuleError} con `repeat`, el Servicio no tiene Repetición o quedan menos de 2 Turnos
   */
  @Post('bookings')
  async create(@Body() dto: CreateBookingDto) {
    const input = {
      serviceId: dto.serviceId,
      startsAt: new Date(dto.startsAt),
      employeeId: dto.employeeId,
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      notes: dto.notes,
      code: dto.code,
    };
    if (dto.repeat) {
      const { count, skipDates } = dto.repeat;
      const booked = await this.createBookingSeriesUseCase.execute({
        ...input,
        // A missing or non-numeric count is NaN, which the use case rejects with the contract message.
        repeat: { count: typeof count === 'number' ? count : NaN, skipDates },
      });
      return {
        ...presentBooking(booked),
        employeeName: booked.employeeName,
        link: booked.link,
        series: booked.series,
      };
    }
    const booking = await this.createBookingUseCase.execute(input);
    return {
      ...presentBooking(booking),
      employeeName: booking.employeeName,
      link: booking.link,
    };
  }

  /**
   * Con `series`, acepta los Turnos pendientes de la Serie que no terminaron (#305) y responde `{ accepted }`.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está pendiente, o con `series` no es de una Serie
   */
  @Patch('bookings/:id/accept')
  @UseGuards(ClerkGuard)
  async accept(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcceptBookingDto,
  ) {
    if (dto.series) {
      const accepted = await this.resolvePendingSeriesUseCase.execute(
        userId,
        id,
        BookingStatus.BOOKED,
      );
      return { accepted: accepted.map(presentBooking) };
    }
    return presentBooking(await this.acceptBookingUseCase.execute(userId, id));
  }

  /**
   * Con `series`, rechaza los Turnos pendientes de la Serie que no terminaron (#305) y responde `{ rejected }`.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está pendiente, o con `series` no es de una Serie
   */
  @Patch('bookings/:id/reject')
  @UseGuards(ClerkGuard)
  async reject(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectBookingDto,
  ) {
    if (dto.series) {
      const rejected = await this.resolvePendingSeriesUseCase.execute(
        userId,
        id,
        BookingStatus.REJECTED,
        reasonOf(dto),
      );
      return { rejected: rejected.map(presentBooking) };
    }
    return presentBooking(
      await this.rejectBookingUseCase.execute(userId, id, reasonOf(dto)),
    );
  }

  /**
   * Con `andFollowing`, cancela también los siguientes de la Serie (#305) y responde `{ cancelled }`.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está aceptado, o con `andFollowing` no es de una Serie
   */
  @Patch('bookings/:id/cancel')
  @UseGuards(ClerkGuard)
  async cancel(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelBookingDto,
  ) {
    if (dto.andFollowing) {
      const cancelled = await this.cancelBookingSeriesUseCase.execute(
        userId,
        id,
        reasonOf(dto),
      );
      return { cancelled: cancelled.map(presentBooking) };
    }
    return presentBooking(
      await this.cancelBookingUseCase.execute(userId, id, reasonOf(dto)),
    );
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
    return presentPanelBooking(
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
   * @throws {BusinessRuleError} el Turno no está aceptado, no terminó, ya tiene Ausencia o tiene Falta del Empleado
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

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   * @throws {BusinessRuleError} el Turno no está aceptado o no tiene Ausencia
   */
  @Delete('bookings/:id/no-show')
  @UseGuards(ClerkGuard)
  async unmarkNoShow(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentBookingWithNoShow(
      await this.unmarkNoShowUseCase.execute(userId, id),
    );
  }

  /**
   * Historial del Turno (ADR 0033), en orden cronológico.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado
   */
  @Get('bookings/:id/history')
  @UseGuards(ClerkGuard)
  async history(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return {
      entries: await this.getBookingHistoryUseCase.execute(userId, id),
    };
  }

  /**
   * Mis turnos (ADR 0023): los Turnos que atiende el Usuario, personales y de los Negocios donde es Empleado activo.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  @Get('users/me/bookings')
  @UseGuards(ClerkGuard)
  async listMine(@CurrentUser() userId: number) {
    return (await this.listMyBookingsUseCase.execute(userId)).map(
      presentUserBooking,
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
