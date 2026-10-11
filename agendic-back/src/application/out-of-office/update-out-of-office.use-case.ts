import { Inject, Injectable } from '@nestjs/common';
import {
  OutOfOffice,
  OutOfOfficeFields,
  assertValidOutOfOffice,
} from '../../domain/out-of-office/out-of-office';
import {
  OUT_OF_OFFICE_REPOSITORY,
  OutOfOfficeRepository,
} from '../../domain/out-of-office/out-of-office.repository';
import { assertNoDuplicateOutOfOffice } from './assert-no-duplicate-out-of-office';
import { getOwnOutOfOffice } from './get-own-out-of-office';

@Injectable()
export class UpdateOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
  ) {}

  /**
   * Reemplaza los datos de un período del Usuario.
   *
   * @throws {NotFoundError} no existe o no es del Usuario
   * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
   * @throws {ConflictError} otro período del Usuario tiene esas fechas
   */
  async execute(
    userId: number,
    id: number,
    input: OutOfOfficeFields,
  ): Promise<OutOfOffice> {
    await getOwnOutOfOffice(this.outOfOffice, id, userId);
    assertValidOutOfOffice(input);
    await assertNoDuplicateOutOfOffice(this.outOfOffice, userId, input, id);
    return this.outOfOffice.update(id, input);
  }
}
