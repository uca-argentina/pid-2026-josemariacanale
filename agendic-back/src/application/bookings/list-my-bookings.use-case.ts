import { Inject, Injectable } from '@nestjs/common';
import { UserBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';

/**
 * Lista los Turnos que atiende el Usuario (ADR 0023): los de sus Servicios personales y los de los Negocios
 * donde sigue siendo Empleado activo.
 */
@Injectable()
export class ListMyBookingsUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
  ) {}

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  execute(userId: number): Promise<UserBooking[]> {
    return this.bookings.listByUser(userId);
  }
}
