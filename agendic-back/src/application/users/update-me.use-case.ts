import { Inject, Injectable } from '@nestjs/common';
import { assertNotReservedSlug } from '../../domain/slugs/assert-not-reserved-slug';
import { NotFoundError } from '../../domain/errors';
import { UpdateMeInput, User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  /**
   * @throws {NotFoundError} el Usuario no existe
   * @throws {ConflictError} el slug es una palabra reservada, o ya es el Enlace de reserva de un Negocio o de otro Usuario
   */
  async execute(userId: number, input: UpdateMeInput): Promise<User> {
    assertNotReservedSlug(input.slug);
    if (Object.values(input).every((value) => value === undefined)) {
      const user = await this.users.findById(userId);
      if (!user) throw new NotFoundError('User not found');
      return user;
    }
    return this.users.update(userId, input);
  }
}
