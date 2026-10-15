import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { CancelBookingSeriesByLinkUseCase } from '../../application/bookings/cancel-booking-series-by-link.use-case';
import { CancelBookingByLinkUseCase } from '../../application/bookings/cancel-booking-by-link.use-case';
import { GetBookingByLinkUseCase } from '../../application/bookings/get-booking-by-link.use-case';
import { RescheduleBookingByLinkUseCase } from '../../application/bookings/reschedule-booking-by-link.use-case';
import { MarkEmployeeNoShowByLinkUseCase } from '../../application/bookings/mark-employee-no-show-by-link.use-case';
import { CLOCK, Clock } from '../../domain/clock';
import { PayDepositByLinkUseCase } from '../../application/bookings/pay-deposit-by-link.use-case';
import { presentClientBooking } from './booking.presenter';
import { RateBookingByLinkUseCase } from '../../application/bookings/rate-booking-by-link.use-case';
import { CancelBookingDto, RateBookingDto, reasonOf, RescheduleBookingDto } from './bookings.dto';

/** Enlace del Turno (ADR 0022): abre, Cancela o Reagenda un Turno solo, sin Código de verificación. */
@Controller('booking-links')
export class BookingLinksController {
  constructor(
    private readonly getBookingByLinkUseCase: GetBookingByLinkUseCase,
    private readonly cancelBookingByLinkUseCase: CancelBookingByLinkUseCase,
    private readonly cancelBookingSeriesByLinkUseCase: CancelBookingSeriesByLinkUseCase,
    private readonly rescheduleBookingByLinkUseCase: RescheduleBookingByLinkUseCase,
    private readonly payDepositByLinkUseCase: PayDepositByLinkUseCase,
    private readonly markEmployeeNoShowByLinkUseCase: MarkEmployeeNoShowByLinkUseCase,
    private readonly rateBookingByLinkUseCase: RateBookingByLinkUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @throws {NotFoundError} el Enlace no corresponde a ningún Turno */
  @Get(':secret')
  async get(@Param('secret') secret: string) {
    return presentClientBooking(await this.getBookingByLinkUseCase.execute(secret), this.clock.now());
  }

  /**
   * Con `andFollowing`, cancela también los siguientes de la Serie (#305) y responde `{ cancelled, kept }`.
   *
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o ya empezó, o con `andFollowing` no es de una Serie
   */
  @Patch(':secret/cancel')
  async cancel(@Param('secret') secret: string, @Body() dto: CancelBookingDto) {
    if (dto.andFollowing) {
      const { cancelled, kept } = await this.cancelBookingSeriesByLinkUseCase.execute(
        secret,
        reasonOf(dto),
      );
      const now = this.clock.now();
      return {
        cancelled: cancelled.map((b) => presentClientBooking(b, now)),
        kept: kept.map((b) => presentClientBooking(b, now)),
      };
    }
    return presentClientBooking(
      await this.cancelBookingByLinkUseCase.execute(secret, reasonOf(dto)),
      this.clock.now(),
    );
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
      this.clock.now(),
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
    return presentClientBooking(await this.payDepositByLinkUseCase.execute(secret), this.clock.now());
  }

  /**
   * Marca la Ausencia del Anfitrión del Turno.
   *
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está aceptado, no empezó, pasó la ventana, o ya tiene Ausencia del Invitado o del Anfitrión
   */
  @Patch(':secret/employee-no-show')
  async markEmployeeNoShow(@Param('secret') secret: string) {
    return presentClientBooking(
      await this.markEmployeeNoShowByLinkUseCase.execute(secret),
      this.clock.now(),
    );
  }

  /**
   * Califica el Turno.
   *
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {ConflictError} el Turno ya tiene Calificación
   * @throws {BusinessRuleError} el Turno no está aceptado, no terminó, o tiene Ausencia del Invitado o del Anfitrión
   */
  @Post(':secret/rating')
  async rate(@Param('secret') secret: string, @Body() dto: RateBookingDto) {
    return presentClientBooking(
      await this.rateBookingByLinkUseCase.execute(secret, dto.score, dto.comment),
      this.clock.now(),
    );
  }
}
