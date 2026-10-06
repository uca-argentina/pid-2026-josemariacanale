import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { Service, UpdateServiceInput } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { getOwnAvailability } from '../availabilities/get-own-availability';
import { assertServiceOwner } from './assert-service-owner';

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /**
   * Actualiza un Servicio: el Dueño del Negocio, o el propio Usuario si es personal.
   *
   * @throws {NotFoundError} el Servicio no existe, o la Availability nueva no es del Usuario
   * @throws {ForbiddenError} no es quien lo gestiona
   * @throws {BusinessRuleError} `availabilityId` en un Servicio del Negocio, que no tiene una propia
   * @throws {ConflictError} el nombre o el tramo nuevo ya está en uso
   */
  async execute(
    userId: number,
    serviceId: number,
    input: UpdateServiceInput,
  ): Promise<Service> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    await assertServiceOwner(this.branches, this.businesses, service, userId);
    if (input.availabilityId !== undefined) {
      if (service.userId === null)
        throw new BusinessRuleError(
          'Only a personal Service has its own Availability',
        );
      await getOwnAvailability(this.availabilities, input.availabilityId, userId);
    }
    return this.services.update(serviceId, input);
  }
}
