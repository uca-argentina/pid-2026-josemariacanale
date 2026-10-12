import { Injectable } from '@nestjs/common';
import { Cabin } from '../../domain/cabins/cabin';
import { CabinsRepository } from '../../domain/cabins/cabins.repository';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Cabin as CabinRow, Prisma } from '../../generated/prisma/client';
import { violatedIndex } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

const NAME_UNIQUE = 'Cabin_branchId_name_ci_key';

/** Acceso a Cabinas contra Postgres. */
@Injectable()
export class PrismaCabinsRepository implements CabinsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveByBranch(branchId: number) {
    return (
      await this.prisma.cabin
        .findMany({
          where: { branchId, deletedAt: null },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        })
        .catch((error) => translateError(error))
    ).map(toCabin);
  }

  async findById(id: number) {
    const row = await this.prisma.cabin
      .findUnique({ where: { id } })
      .catch((error) => translateError(error));
    return row && toCabin(row);
  }

  async create(branchId: number, name: string) {
    return toCabin(
      await this.prisma.cabin
        .create({ data: { branchId, name } })
        .catch((error) => translateError(error, branchId, name)),
    );
  }

  async rename(cabin: Cabin, name: string) {
    return toCabin(
      await this.prisma.cabin
        .update({ where: { id: cabin.id }, data: { name } })
        .catch((error) => translateError(error, cabin.branchId, name)),
    );
  }

  async retire(id: number) {
    await this.prisma.cabin
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .catch((error) => translateError(error));
  }
}

const toCabin = (row: CabinRow): Cabin => ({
  id: row.id,
  branchId: row.branchId,
  name: row.name,
  deletedAt: row.deletedAt,
});

const translateError = (
  error: unknown,
  branchId?: number,
  name?: string,
): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002' && violatedIndex(error) === NAME_UNIQUE)
      throw new ConflictError(
        `Cabin name ${name} already in use in Branch ${branchId}`,
        { cause: error },
      );
    if (error.code === 'P2025')
      throw new NotFoundError('Cabin not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
