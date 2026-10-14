import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  Availability,
  AvailabilityFields,
  assertValidAvailability,
} from '../../domain/availabilities/availability';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { LeftOutsideBookingsService } from '../bookings/left-outside-bookings.service';
import { notifyCausedCancellations } from '../bookings/notify-caused-cancellations';
import { confirmedCancellations } from '../out-of-office/confirmed-cancellations';
import { getOwnAvailability } from './get-own-availability';

@Injectable()
export class UpdateAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    private readonly leftOutside: LeftOutsideBookingsService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Reemplaza todas las Franjas y Anulaciones. Cancela, en la misma transacción, los Turnos que el cambio deja afuera
   * (ADR 0034) y avisa a sus Clientes; los ids de `cancelBookingIds` que ya no quedan afuera se ignoran.
   *
   * @param cancelBookingIds los Turnos que el Usuario vio en la vista previa y confirmó
   * @throws {NotFoundError} no existe o no es del Usuario
   * @throws {BusinessRuleError} la zona no es IANA, o un rango termina antes de empezar o se pisa con otro
   * @throws {ConflictError} queda afuera algún Turno que `cancelBookingIds` no incluye
   */
  async execute(
    userId: number,
    id: number,
    input: AvailabilityFields,
    cancelBookingIds: number[] = [],
  ): Promise<{ availability: Availability; cancelledBookings: number }> {
    const current = await getOwnAvailability(this.availabilities, id, userId);
    assertValidAvailability(input);

    const left = await this.leftOutside.forAvailability(userId, current, input);
    if (left.length === 0)
      return {
        availability: await this.availabilities.replace(id, input),
        cancelledBookings: 0,
      };
    const orders = confirmedCancellations(left, cancelBookingIds);
    const { availability, cancelledIds } =
      await this.availabilities.replaceCancelling(
        id,
        input,
        orders,
        this.clock.now(),
      );
    const cancelled = new Set(cancelledIds);
    await notifyCausedCancellations(
      this.mailer,
      left.filter((booking) => cancelled.has(booking.id)),
    );
    return { availability, cancelledBookings: cancelledIds.length };
  }
}
