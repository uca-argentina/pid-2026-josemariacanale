import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { ConflictError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  OutOfOffice,
  OutOfOfficeFields,
  assertValidOutOfOffice,
} from '../../domain/out-of-office/out-of-office';
import {
  OUT_OF_OFFICE_REPOSITORY,
  OutOfOfficeRepository,
} from '../../domain/out-of-office/out-of-office.repository';
import { LeftOutsideBookingsService } from '../bookings/left-outside-bookings.service';
import { notifyCausedCancellations } from '../bookings/notify-caused-cancellations';
import { assertNoDuplicateOutOfOffice } from './assert-no-duplicate-out-of-office';
import { getOwnOutOfOffice } from './get-own-out-of-office';

@Injectable()
export class UpdateOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
    private readonly leftOutside: LeftOutsideBookingsService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Reemplaza los datos de un período del Usuario. Cancela, en la misma transacción, los Turnos que la edición deja
   * afuera (ADR 0034) y avisa a sus Clientes; achicar el período no descancela nada. Los ids de `cancelBookingIds` que
   * ya no quedan afuera se ignoran.
   *
   * @param cancelBookingIds los Turnos que el Usuario vio en la vista previa y confirmó
   * @throws {NotFoundError} no existe o no es del Usuario
   * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
   * @throws {ConflictError} otro período del Usuario tiene esas fechas, o queda afuera algún Turno que `cancelBookingIds` no incluye
   */
  async execute(
    userId: number,
    id: number,
    input: OutOfOfficeFields,
    cancelBookingIds: number[] = [],
  ): Promise<{ outOfOffice: OutOfOffice; cancelledBookings: number }> {
    const current = await getOwnOutOfOffice(this.outOfOffice, id, userId);
    assertValidOutOfOffice(input);
    await assertNoDuplicateOutOfOffice(this.outOfOffice, userId, input, id);

    const left = await this.leftOutside.forOutOfOffice(userId, input, current);
    if (left.length === 0)
      return {
        outOfOffice: await this.outOfOffice.update(id, input),
        cancelledBookings: 0,
      };
    const confirmed = new Set(cancelBookingIds);
    if (left.some((booking) => !confirmed.has(booking.id)))
      throw new ConflictError(
        'Los Turnos que quedan fuera de tu horario cambiaron',
      );

    const { outOfOffice, cancelledIds } =
      await this.outOfOffice.updateCancelling(
        id,
        input,
        left.map((booking) => ({
          id: booking.id,
          cause: booking.cancellationCause,
          reason: booking.cancellationReason,
        })),
        this.clock.now(),
      );
    const cancelled = new Set(cancelledIds);
    await notifyCausedCancellations(
      this.mailer,
      left.filter((booking) => cancelled.has(booking.id)),
    );
    return { outOfOffice, cancelledBookings: cancelledIds.length };
  }
}
