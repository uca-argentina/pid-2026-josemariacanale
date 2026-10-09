import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/** Abre el Enlace de reserva de un Usuario: sus Servicios personales a la vista (ADR 0021). */
@Injectable()
export class GetUserPageUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  /**
   * Los Servicios ocultos no salen: se llega a ellos solo por su propio tramo. El tramo se compara en minúsculas.
   *
   * @throws {NotFoundError} ningún Usuario tiene ese tramo
   */
  async execute(
    userSlug: string,
  ): Promise<{ user: User; services: Service[] }> {
    const user = await this.users.findBySlug(userSlug.toLowerCase());
    if (!user || user.deletedAt) throw new NotFoundError('User not found');
    const services = (await this.services.listActiveByUser(user.id)).filter(
      (service) => !service.hidden,
    );
    return { user, services };
  }
}
