import { Inject, Injectable } from '@nestjs/common';
import { assertAssignedAttendant } from '../bookings/assert-assigned-attendant';
import { BookingStatus } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../domain/errors';
import { StreakPrize } from '../../domain/streaks/streak-prize';
import {
  STREAK_PRIZES_REPOSITORY,
  StreakPrizesRepository,
} from '../../domain/streaks/streak-prizes.repository';

/**
 * Canjea un Premio de la Ficha del Cliente en un Turno aceptado. Puede ser un Turno de cualquier Servicio de la misma
 * Ficha: el Negocio decide dónde lo entrega.
 */
@Injectable()
export class RedeemStreakPrizeUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(STREAK_PRIZES_REPOSITORY)
    private readonly prizes: StreakPrizesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Turno o el Premio no existen
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado, el Premio es de otra Ficha del Cliente o venció
   * @throws {ConflictError} el Premio ya se Canjeó
   */
  async execute(
    userId: number,
    bookingId: number,
    prizeId: number,
  ): Promise<StreakPrize> {
    const booking = await this.bookings.findById(bookingId);
    await assertAssignedAttendant(
      this.employees,
      booking,
      userId,
      'Only the assigned Employee can act on this Turno',
    );
    if (booking.status !== BookingStatus.BOOKED)
      throw new BusinessRuleError(`Booking ${bookingId} is not accepted`);

    const prize = await this.prizes.findById(prizeId);
    if (!prize) throw new NotFoundError(`Prize ${prizeId} not found`);
    const owner = await this.prizes.findOwnerByBookingId(bookingId);
    const sameOwner = JSON.stringify(prize.owner) === JSON.stringify(owner);
    if (!sameOwner || prize.clientEmail !== booking.clientEmail.toLowerCase())
      throw new BusinessRuleError(
        `Prize ${prizeId} belongs to another Ficha del Cliente`,
      );

    const now = this.clock.now();
    if (prize.redeemedAt) throw new ConflictError(`Prize ${prizeId} already redeemed`);
    if (prize.expiresAt && prize.expiresAt <= now)
      throw new BusinessRuleError(`Prize ${prizeId} expired`);
    return this.prizes.redeem(prizeId, bookingId, userId, now);
  }
}
