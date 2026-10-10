import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from '../bookings/notify-clients';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/**
 * Da de baja al Usuario de la Sesión (ADR 0024).
 *
 * Si es Dueño, su Negocio cae con él. Primero en Postgres y después en Clerk, que no comparten
 * transacción. Repetir la baja salta el primer paso y solo reintenta el borrado en Clerk.
 *
 * Entre los dos pasos le avisa por mail al Cliente de cada Turno futuro que se canceló.
 *
 * @throws {NotFoundError} el Usuario no existe
 * @throws {ExternalServiceError} Clerk falló; la fila ya quedó dada de baja
 */
@Injectable()
export class RetireMeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /** Repetir la baja de un Usuario ya dado de baja solo reintenta el borrado en Clerk. */
  async execute(userId: number): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);
    if (!user.deletedAt) {
      const { cancelledBookings } = await this.users.retire(
        userId,
        this.clock.now(),
      );
      await notifyClients(cancelledBookings, (email, link) =>
        this.mailer.sendBookingCancellation(email, link),
      );
    }
    await this.clerkAuth.deleteUser(user.clerkId);
  }
}
