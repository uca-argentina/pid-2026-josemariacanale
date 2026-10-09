import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/**
 * Da de baja al Usuario de la Sesión (ADR 0023): primero en Postgres y después en Clerk, que no comparten
 * transacción. Repetir la baja salta el primer paso y solo reintenta el borrado en Clerk.
 *
 * @throws {NotFoundError} el Usuario no existe
 * @throws {BusinessRuleError} el Usuario es Dueño de un Negocio (transitorio, hasta #122)
 * @throws {ExternalServiceError} Clerk falló; la fila ya quedó dada de baja
 */
@Injectable()
export class RetireMeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: number): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);
    if (!user.deletedAt) {
      // Transitorio: dar de baja al Dueño arrastra su Negocio, y eso lo hace #122.
      if ((await this.businesses.listByOwner(userId)).length)
        throw new BusinessRuleError('El Dueño no puede darse de baja todavía');
      await this.users.retire(userId, this.clock.now());
    }
    await this.clerkAuth.deleteUser(user.clerkId);
  }
}
