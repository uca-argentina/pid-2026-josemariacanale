import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';
import { Prisma, User as UserRow } from '../../generated/prisma/client';
import { cancelFutureBooked } from '../bookings/cancel-future-booked';
import { toIntervalRows } from '../availabilities/prisma-availabilities.repository';
import { violatedIndex } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The nested create is one transaction: a Usuario never exists without its default Availability. */
  async create(data: Pick<User, 'clerkId' | 'name' | 'email' | 'imageUrl'>) {
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
                  create: toIntervalRows(DEFAULT_AVAILABILITY.schedule),
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
      .findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          // A Usuario dado de baja is gone for Clerk too: the same email is a new person to invite.
          deletedAt: null,
        },
      })
      .catch(translateError);
    return row && toUser(row);
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.user
      .findUnique({ where: { slug } })
      .catch(translateError);
    return row && toUser(row);
  }

  /**
   * @throws {ConflictError} el slug ya es el Enlace de reserva de otro Usuario
   * @throws {NotFoundError} el Usuario no existe
   */
  async update(
    id: number,
    data: Partial<Pick<User, 'name' | 'email'>> & { slug?: string },
  ) {
    return toUser(
      await this.prisma.user
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }

  /**
   * @throws {NotFoundError} el Usuario no existe
   */
  async retire(id: number, deletedAt: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { deletedAt } });
        // Their Servicios personales drop the Availability too, as a single retired Servicio does.
        await tx.service.updateMany({
          where: { userId: id, deletedAt: null },
          data: { deletedAt, availabilityId: null },
        });
        await tx.employeeService.deleteMany({ where: { employee: { userId: id } } });
        await tx.employee.updateMany({
          where: { userId: id, deletedAt: null },
          data: { deletedAt },
        });
        const ownCancelled = await cancelFutureBooked(tx, { userId: id }, deletedAt);
        const business = await tx.business.findUnique({
          where: { ownerId: id },
          select: { id: true },
        });
        const businessCancelled = business
          ? await retireBusiness(tx, business.id, deletedAt)
          : 0;
        const cancelledBookings = ownCancelled + businessCancelled;
        return { cancelledBookings };
      })
      .catch(translateError);
  }
}

/** El Negocio cae con su Dueño: todo su Staff y sus Servicios, no solo lo del Dueño. Devuelve los Turnos cancelados. */
const retireBusiness = async (
  tx: Prisma.TransactionClient,
  businessId: number,
  deletedAt: Date,
) => {
  await tx.business.update({ where: { id: businessId }, data: { deletedAt } });
  await tx.service.updateMany({
    where: { branch: { businessId }, deletedAt: null },
    data: { deletedAt, availabilityId: null },
  });
  await tx.employeeService.deleteMany({ where: { employee: { businessId } } });
  await tx.employee.updateMany({
    where: { businessId, deletedAt: null },
    data: { deletedAt },
  });
  await tx.invitation.updateMany({
    where: { businessId, closedAt: null },
    data: { closedAt: deletedAt },
  });
  return cancelFutureBooked(tx, { businessId }, deletedAt);
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  clerkId: row.clerkId,
  name: row.name,
  email: row.email,
  slug: row.slug,
  imageUrl: row.imageUrl,
  createdAt: row.createdAt,
  deletedAt: row.deletedAt,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError(
        violatedIndex(error) === 'User_slug_key'
          ? 'Booking link already in use'
          : 'Clerk identity already registered',
        { cause: error },
      );
    if (error.code === 'P2025')
      throw new NotFoundError('User not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
