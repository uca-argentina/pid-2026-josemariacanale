import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/** Abre un Servicio personal por su tramo del Enlace de reserva del Usuario (ADR 0021). */
@Injectable()
export class GetPersonalServiceBySlugUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  /**
   * Devuelve el Servicio aunque esté oculto: su tramo es la única puerta a él. Los tramos se comparan en minúsculas.
   *
   * @throws {NotFoundError} el Usuario no existe, o ningún Servicio personal suyo no dado de baja tiene ese tramo
   */
  async execute(userSlug: string, serviceSlug: string): Promise<Service> {
    const user = await this.users.findBySlug(userSlug.toLowerCase());
    if (!user) throw new NotFoundError('User not found');
    const service = await this.services.findActiveByUserSlug(
      user.id,
      serviceSlug.toLowerCase(),
    );
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }
}
