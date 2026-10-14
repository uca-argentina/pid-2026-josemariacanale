import { Inject, Injectable } from '@nestjs/common';
import {
  OutOfOfficeFields,
  assertValidOutOfOffice,
} from '../../domain/out-of-office/out-of-office';
import {
  OUT_OF_OFFICE_REPOSITORY,
  OutOfOfficeRepository,
} from '../../domain/out-of-office/out-of-office.repository';
import {
  LeftOutsideBooking,
  LeftOutsideBookingsService,
} from '../bookings/left-outside-bookings.service';
import { assertNoDuplicateOutOfOffice } from './assert-no-duplicate-out-of-office';

/** Vista previa de los Turnos que un período Fuera de la oficina nuevo deja afuera (ADR 0034). */
@Injectable()
export class PreviewOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
    private readonly leftOutside: LeftOutsideBookingsService,
  ) {}

  /**
   * Los Turnos que un período Fuera de la oficina nuevo dejaría afuera, sin guardar nada. Falla igual que crearlo y en el
   * mismo orden, antes de calcular.
   *
   * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
   * @throws {ConflictError} el Usuario ya tiene un período con esas fechas
   */
  async execute(
    userId: number,
    input: OutOfOfficeFields,
  ): Promise<LeftOutsideBooking[]> {
    assertValidOutOfOffice(input);
    await assertNoDuplicateOutOfOffice(this.outOfOffice, userId, input);
    return this.leftOutside.forNewOutOfOffice(userId, input);
  }
}
