import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CancelBookingByLinkUseCase } from '../../application/bookings/cancel-booking-by-link.use-case';
import { GetBookingByLinkUseCase } from '../../application/bookings/get-booking-by-link.use-case';
import { RescheduleBookingByLinkUseCase } from '../../application/bookings/reschedule-booking-by-link.use-case';
import { PayDepositByLinkUseCase } from '../../application/bookings/pay-deposit-by-link.use-case';
import { presentClientBooking } from './booking.presenter';
import { RescheduleBookingDto } from './bookings.dto';

/** Enlace del Turno (ADR 0022): abre, Cancela o Reagenda un Turno solo, sin Código de verificación. */
@Controller('booking-links')
export class BookingLinksController {
  constructor(
    private readonly getBookingByLinkUseCase: GetBookingByLinkUseCase,
    private readonly cancelBookingByLinkUseCase: CancelBookingByLinkUseCase,
    private readonly rescheduleBookingByLinkUseCase: RescheduleBookingByLinkUseCase,
    private readonly payDepositByLinkUseCase: PayDepositByLinkUseCase,
  ) {}

  /** @throws {NotFoundError} el Enlace no corresponde a ningún Turno */
  @Get(':secret')
  async get(@Param('secret') secret: string) {
    return presentClientBooking(await this.getBookingByLinkUseCase.execute(secret));
  }

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o ya empezó
   */
  @Patch(':secret/cancel')
  async cancel(@Param('secret') secret: string) {
    return presentClientBooking(await this.cancelBookingByLinkUseCase.execute(secret));
  }

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o `startsAt` no es un Horario reservable
   * @throws {ConflictError} el horario nuevo pisa otro Turno del Empleado
   */
  @Patch(':secret/reschedule')
  async reschedule(@Param('secret') secret: string, @Body() dto: RescheduleBookingDto) {
    return presentClientBooking(
      await this.rescheduleBookingByLinkUseCase.execute(secret, new Date(dto.startsAt)),
    );
  }

  /**
   * Paga la Seña del Turno (simulado).
   *
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, ya empezó, no tiene Seña o ya la tiene pagada
   */
  @Patch(':secret/deposit')
  async payDeposit(@Param('secret') secret: string) {
    return presentClientBooking(await this.payDepositByLinkUseCase.execute(secret));
  }
}
