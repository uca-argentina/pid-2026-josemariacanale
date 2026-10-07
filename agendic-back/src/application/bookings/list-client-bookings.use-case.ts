import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';

/** Mis turnos del Cliente: todos sus Turnos, en cualquier Negocio o Servicio personal (ADR 0022). */
@Injectable()
export class ListClientBookingsUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
  ) {}

  execute(email: string): Promise<ClientBooking[]> {
    return this.bookings.findByClientEmail(email);
  }
}
