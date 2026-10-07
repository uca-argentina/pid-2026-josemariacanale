import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';

/** Abre el Turno de su Enlace del Turno, en cualquier estado (ADR 0022). */
@Injectable()
export class GetBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
  ) {}

  /** @throws {NotFoundError} el Enlace no corresponde a ningún Turno */
  execute(link: string): Promise<ClientBooking> {
    return this.bookings.findByLink(link);
  }
}
