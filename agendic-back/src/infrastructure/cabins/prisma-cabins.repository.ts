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

  /** @throws {DatabaseOperationError} the query failed */
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

  /** @throws {DatabaseOperationError} the query failed */
  async findById(id: number) {
    const row = await this.prisma.cabin
      .findUnique({ where: { id } })
      .catch((error) => translateError(error));
    return row && toCabin(row);
  }

  /**
   * @throws {ConflictError} the name is in use in the Sucursal
   * @throws {DatabaseOperationError} the insert failed
   */
  async create(branchId: number, name: string) {
    return toCabin(
      await this.prisma.cabin
        .create({ data: { branchId, name } })
        .catch((error) => translateError(error, undefined, branchId, name)),
    );
  }

  /**
   * @throws {ConflictError} the name is in use in the Sucursal
   * @throws {NotFoundError} the Cabina no longer exists
   * @throws {DatabaseOperationError} the update failed
   */
  async rename(cabin: Cabin, name: string) {
    return toCabin(
      await this.prisma.cabin
        .update({ where: { id: cabin.id }, data: { name } })
        .catch((error) =>
          translateError(error, cabin.id, cabin.branchId, name),
        ),
    );
  }

  /**
   * Also takes it out of every Servicio that admitted it, atomically.
   *
   * @throws {NotFoundError} the Cabina no longer exists
   * @throws {DatabaseOperationError} the update failed
   */
  async retire(id: number) {
    await this.prisma
      .$transaction([
        this.prisma.serviceCabin.deleteMany({ where: { cabinId: id } }),
        this.prisma.cabin.update({
          where: { id },
          data: { deletedAt: new Date() },
        }),
      ])
      .catch((error) => translateError(error, id));
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
  id?: number,
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
      throw new NotFoundError(`Cabin ${id} not found`, { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
