import { Inject, Injectable } from '@nestjs/common';
import {
  OUT_OF_OFFICE_REPOSITORY,
  OutOfOfficeRepository,
} from '../../domain/out-of-office/out-of-office.repository';
import { getOwnOutOfOffice } from './get-own-out-of-office';

@Injectable()
export class DeleteOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
  ) {}

  /** @throws {NotFoundError} no existe o no es del Usuario */
  async execute(userId: number, id: number): Promise<void> {
    await getOwnOutOfOffice(this.outOfOffice, id, userId);
    await this.outOfOffice.delete(id);
  }
}
