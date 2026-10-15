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
import { getOwnOutOfOffice } from './get-own-out-of-office';

/** Vista previa de los Turnos que editar un período Fuera de la oficina deja afuera (ADR 0034). */
@Injectable()
export class PreviewEditOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
    private readonly leftOutside: LeftOutsideBookingsService,
  ) {}

  /**
   * Los Turnos que el período editado dejaría afuera, sin guardar nada: solo los de los días que se suman. Falla igual
   * que editarlo y en el mismo orden, antes de calcular.
   *
   * @throws {NotFoundError} el período no existe o no es del Usuario
   * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
   * @throws {ConflictError} otro período del Usuario tiene esas fechas
   */
  async execute(
    userId: number,
    id: number,
    input: OutOfOfficeFields,
  ): Promise<LeftOutsideBooking[]> {
    const current = await getOwnOutOfOffice(this.outOfOffice, id, userId);
    assertValidOutOfOffice(input);
    await assertNoDuplicateOutOfOffice(this.outOfOffice, userId, input, id);
    return this.leftOutside.forOutOfOffice(userId, input, current);
  }
}
