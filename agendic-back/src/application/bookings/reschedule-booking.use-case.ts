import { Inject, Injectable } from '@nestjs/common';
import { Booking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { ConflictError, BusinessRuleError } from '../../domain/errors';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { findOwnBookedBooking } from './find-own-booked-booking';

const DAY_MS = 86_400_000;
const isoDate = (instant: Date) => instant.toISOString().slice(0, 10);

/** Mueve un Turno aceptado a otro Horario reservable del mismo Servicio y Empleado. */
@Injectable()
export class RescheduleBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Conserva la duración fijada al reservar y no repite la Verificación de email.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado, o `startsAt` no es un Horario reservable
   * @throws {ConflictError} `startsAt` pisa otro Turno pendiente o aceptado del Empleado
   */
  async execute(
    userId: number,
    bookingId: number,
    startsAt: Date,
  ): Promise<Booking> {
    const booking = await findOwnBookedBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
    );
    const endsAt = new Date(
      startsAt.getTime() + (booking.endsAt.getTime() - booking.startsAt.getTime()),
    );
    if (
      await this.bookings.hasOverlappingOccupied(
        booking.employeeId,
        startsAt,
        endsAt,
        bookingId,
      )
    )
      throw new ConflictError('Overlaps a booked Turno for this Employee');

    const { days } = await this.listSlots.execute(
      booking.serviceId,
      booking.employeeId,
      isoDate(new Date(startsAt.getTime() - DAY_MS)),
      isoDate(new Date(startsAt.getTime() + DAY_MS)),
      bookingId,
    );
    if (!days.some((day) => day.slots.includes(startsAt.toISOString())))
      throw new BusinessRuleError('startsAt is not a Horario reservable');
    return this.bookings.reschedule(bookingId, startsAt, endsAt);
  }
}
