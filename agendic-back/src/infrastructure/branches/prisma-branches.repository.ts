import { Injectable } from '@nestjs/common';
import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Branch as BranchRow, Prisma } from '../../generated/prisma/client';
import { violatedIndex } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaBranchesRepository implements BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Pick<
      Branch,
      'businessId' | 'name' | 'address' | 'timeZone' | 'slug'
    > &
      Partial<Pick<Branch, 'description'>>,
  ) {
    return toBranch(
      await this.prisma.branch
        .create({
          data: {
            businessId: data.businessId,
            name: data.name,
            address: data.address,
            timeZone: data.timeZone,
            slug: data.slug,
            description: data.description,
          },
        })
        .catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.branch
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toBranch(row);
  }

  async listByBusiness(businessId: number) {
    return (
      await this.prisma.branch
        .findMany({ where: { businessId } })
        .catch(translateError)
    ).map(toBranch);
  }

  async update(
    id: number,
    data: Partial<
      Pick<Branch, 'name' | 'address' | 'timeZone' | 'slug' | 'description'>
    >,
  ) {
    return toBranch(
      await this.prisma.branch
        .update({
          where: { id },
          data: {
            name: data.name,
            address: data.address,
            timeZone: data.timeZone,
            slug: data.slug,
            description: data.description,
          },
        })
        .catch(translateError),
    );
  }
}

export const toTime = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
export const fromTime = (date: Date) => date.toISOString().slice(11, 16);

export const toBranch = (row: BranchRow): Branch => ({
  id: row.id,
  businessId: row.businessId,
  name: row.name,
  address: row.address,
  timeZone: row.timeZone,
  slug: row.slug,
  description: row.description,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (
      error.code === 'P2002' &&
      violatedIndex(error) === 'Branch_businessId_slug_key'
    )
      throw new ConflictError('Booking link already in use', { cause: error });
    if (error.code === 'P2025')
      throw new NotFoundError('Branch not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
