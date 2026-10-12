import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { employeeNoShowBlocker } from '../../domain/bookings/employee-no-show';
import { BusinessRuleError } from '../../domain/errors';

/**
 * Marca la Falta del Empleado de un Turno por su Enlace del Turno: solo en un Turno aceptado sin Ausencia, desde que
 * empieza hasta 24 horas después de que termina. Nadie la deshace.
 */
@Injectable()
export class MarkEmployeeNoShowByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está aceptado, no empezó, pasó la ventana, o ya tiene Ausencia o Falta del Empleado
   */
  async execute(link: string): Promise<ClientBooking> {
    const now = this.clock.now();
    const booking = await this.bookings.findByLink(link);
    const blocker = employeeNoShowBlocker(booking, now);
    if (blocker) throw new BusinessRuleError(blocker);
    return this.bookings.markEmployeeNoShow(booking.id, now);
  }
}
