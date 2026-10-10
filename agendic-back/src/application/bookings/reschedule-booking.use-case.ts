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
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { MAILER, Mailer } from '../../domain/mailer';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { notifyClients } from './notify-clients';
import { pickEmployee } from './pick-employee';
import { findOwnBookedBooking } from './find-own-booked-booking';

/** Mueve un Turno aceptado a otro Horario reservable del mismo Servicio, con el mismo Empleado si está libre y si no con otro (ver `pickEmployee`), y le avisa por mail al Cliente. */
@Injectable()
export class RescheduleBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    private readonly listSlots: ListSlotsUseCase,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * Conserva la duración fijada al reservar y no repite la Verificación de email. La preparación es la que el
   * Servicio tiene hoy, la misma con la que el cálculo de Horarios reservables valida el horario nuevo, así nunca
   * queda fuera de la Franja. El Límite diario del día de destino también lo descuenta ese cálculo, sin contar a
   * este mismo Turno.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado, o `startsAt` no es un Horario reservable de ningún Empleado (incluido un día que ya alcanzó el Límite diario)
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
    const service = await this.services.findById(booking.serviceId);
    const prepStartsAt = new Date(
      startsAt.getTime() - (service?.prepMinutes ?? 0) * 60_000,
    );
    const attendant = await pickEmployee(
      this.listSlots,
      this.bookings,
      booking.serviceId,
      startsAt,
      { excludeBookingId: bookingId, keepEmployeeId: booking.employeeId ?? undefined },
    );
    const rescheduled = await this.bookings.reschedule(bookingId, {
      ...attendant,
      prepStartsAt,
      startsAt,
      endsAt,
    });
    await notifyClients([rescheduled], (email, link) =>
      this.mailer.sendBookingReschedule(email, link),
    );
    return rescheduled;
  }
}
