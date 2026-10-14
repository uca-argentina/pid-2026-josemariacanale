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

@Injectable()
export class CreateOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
    private readonly leftOutside: LeftOutsideBookingsService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Crea un período Fuera de la oficina del Usuario; acepta fechas pasadas y períodos solapados. Cancela, en la misma
   * transacción, los Turnos que deja afuera (ADR 0034) y avisa a sus Clientes. Los ids de `cancelBookingIds` que ya no
   * quedan afuera se ignoran.
   *
   * @param cancelBookingIds los Turnos que el Usuario vio en la vista previa y confirmó
   * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
   * @throws {ConflictError} el Usuario ya tiene un período con esas fechas, o queda afuera algún Turno que `cancelBookingIds` no incluye
   */
  async execute(
    userId: number,
    input: OutOfOfficeFields,
    cancelBookingIds: number[] = [],
  ): Promise<{ outOfOffice: OutOfOffice; cancelledBookings: number }> {
    assertValidOutOfOffice(input);
    await assertNoDuplicateOutOfOffice(this.outOfOffice, userId, input);

    const left = await this.leftOutside.forOutOfOffice(userId, input);
    if (left.length === 0)
      return {
        outOfOffice: await this.outOfOffice.create(userId, input),
        cancelledBookings: 0,
      };
    const confirmed = new Set(cancelBookingIds);
    if (left.some(({ id }) => !confirmed.has(id)))
      throw new ConflictError(
        'Los Turnos que quedan fuera de tu horario cambiaron',
      );

    const { outOfOffice, cancelledIds } =
      await this.outOfOffice.createCancelling(
        userId,
        input,
        left.map(({ id, cancellationCause, cancellationReason }) => ({
          id,
          cause: cancellationCause,
          reason: cancellationReason,
        })),
        this.clock.now(),
      );
    const cancelled = new Set(cancelledIds);
    await notifyCausedCancellations(
      this.mailer,
      left.filter(({ id }) => cancelled.has(id)),
    );
    return { outOfOffice, cancelledBookings: cancelledIds.length };
  }
}
