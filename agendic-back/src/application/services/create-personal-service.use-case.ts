import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  CreatePersonalServiceInput,
  Service,
} from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { getOwnAvailability } from '../availabilities/get-own-availability';

/** Crea un Servicio personal: de un Usuario, sin Negocio ni Sucursal (ADR 0021). */
@Injectable()
export class CreatePersonalServiceUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /**
   * @throws {NotFoundError} la Availability no existe o no es del Usuario
   * @throws {ConflictError} el nombre o el tramo ya lo usa otro Servicio personal activo del Usuario
   */
  async execute(
    userId: number,
    input: CreatePersonalServiceInput,
  ): Promise<Service> {
    await getOwnAvailability(this.availabilities, input.availabilityId, userId);
    return this.services.createPersonal({
      userId,
      availabilityId: input.availabilityId,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      durationMinutes: input.durationMinutes,
      price: input.price,
      depositPercent: input.depositPercent ?? null,
      requiresApproval: input.requiresApproval ?? false,
      slug: input.slug,
      hidden: input.hidden ?? false,
      prepMinutes: input.prepMinutes ?? 0,
      dailyLimit: input.dailyLimit ?? null,
      slotInterval: input.slotInterval ?? null,
      minimumNoticeMinutes: input.minimumNoticeMinutes ?? 0,
    });
  }
}
