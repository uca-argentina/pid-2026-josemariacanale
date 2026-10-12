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

@Injectable()
export class CreateOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
  ) {}

  /**
   * Crea un período Fuera de la oficina del Usuario; acepta fechas pasadas y períodos solapados.
   *
   * @throws {BusinessRuleError} la fecha de fin es anterior a la de inicio
   * @throws {ConflictError} el Usuario ya tiene un período con esas fechas
   */
  async execute(
    userId: number,
    input: OutOfOfficeFields,
  ): Promise<OutOfOffice> {
    assertValidOutOfOffice(input);
    await assertNoDuplicateOutOfOffice(this.outOfOffice, userId, input);
    return this.outOfOffice.create(userId, input);
  }
}
