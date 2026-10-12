import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { ratingBlocker } from '../../domain/bookings/rating';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError, ConflictError } from '../../domain/errors';

/**
 * Califica un Turno por su Enlace del Turno: una sola vez, sin editarla, sobre un Turno aceptado que ya terminó sin
 * Ausencia ni Falta del Empleado. Un comentario vacío o de solo espacios se guarda como null.
 */
@Injectable()
export class RateBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {ConflictError} el Turno ya tiene Calificación
   * @throws {BusinessRuleError} el Turno no se puede Calificar
   */
  async execute(link: string, score: number, comment?: string): Promise<ClientBooking> {
    const booking = await this.bookings.findByLink(link);
    if (booking.rating) throw new ConflictError('Turno already rated');
    if (ratingBlocker(booking, this.clock.now())) throw new BusinessRuleError('Turno cannot be rated');
    return this.bookings.rate(booking.id, score, comment?.trim() || null);
  }
}
