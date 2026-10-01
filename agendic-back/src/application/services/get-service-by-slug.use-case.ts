import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';

/** Abre un Servicio por su tramo del Enlace de reserva (ADR 0018). */
@Injectable()
export class GetServiceBySlugUseCase {
  constructor(
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  /**
   * Devuelve el Servicio aunque esté oculto: su tramo es la única puerta a él. El tramo se compara en minúsculas.
   *
   * @throws {NotFoundError} la Sucursal no existe, o ningún Servicio suyo no dado de baja tiene ese tramo
   * @throws {DatabaseOperationError} falló la base
   */
  async execute(branchId: number, slug: string): Promise<Service> {
    const branch = await this.branches.findById(branchId);
    if (!branch) throw new NotFoundError('Branch not found');
    const service = await this.services.findActiveBySlug(
      branchId,
      slug.toLowerCase(),
    );
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }
}
