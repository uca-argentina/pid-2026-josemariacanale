import { Inject, Injectable } from '@nestjs/common';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';

/** Los Servicios personales del Usuario, ocultos incluidos: es su panel. */
@Injectable()
export class ListPersonalServicesUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  /** @throws {DatabaseOperationError} falló la base */
  execute(userId: number): Promise<Service[]> {
    return this.services.listActiveByUser(userId);
  }
}
