import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import {
  DEFAULT_AVAILABILITY,
  scheduleToIntervals,
} from '../../domain/availabilities/availability';
import { User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';
import { Prisma, User as UserRow } from '../../generated/prisma/client';
import { toTime } from '../branches/prisma-branches.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The nested create is one transaction: a Usuario never exists without its default Availability. */
  async create(data: Pick<User, 'clerkId' | 'name' | 'email'>) {
    return toUser(
      await this.prisma.user
        .create({
          data: {
            ...data,
            availabilities: {
              create: {
                name: DEFAULT_AVAILABILITY.name,
                timeZone: DEFAULT_AVAILABILITY.timeZone,
                isDefault: true,
                intervals: {
                  create: scheduleToIntervals(DEFAULT_AVAILABILITY.schedule).map(
                    ({ days, start, end }) => ({
                      days,
                      startTime: toTime(start),
                      endTime: toTime(end),
                    }),
                  ),
                },
              },
            },
          },
        })
        .catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.user
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toUser(row);
  }

  async findByClerkId(clerkId: string) {
    const row = await this.prisma.user
      .findUnique({ where: { clerkId } })
      .catch(translateError);
    return row && toUser(row);
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user
      .findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
      .catch(translateError);
    return row && toUser(row);
  }

  async update(id: number, data: Partial<Pick<User, 'name' | 'email'>>) {
    return toUser(
      await this.prisma.user
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  clerkId: row.clerkId,
  name: row.name,
  email: row.email,
  createdAt: row.createdAt,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError('Clerk identity already registered', {
        cause: error,
      });
    if (error.code === 'P2025')
      throw new NotFoundError('User not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
