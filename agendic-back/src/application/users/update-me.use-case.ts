import { Inject, Injectable } from '@nestjs/common';
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
   * @throws {ConflictError} el slug ya es el Enlace de reserva de otro Usuario
   */
  async execute(userId: number, { name, slug }: UpdateMeInput): Promise<User> {
    if (name === undefined && slug === undefined) {
      const user = await this.users.findById(userId);
      if (!user) throw new NotFoundError('User not found');
      return user;
    }
    return this.users.update(userId, { name, slug });
  }
}
