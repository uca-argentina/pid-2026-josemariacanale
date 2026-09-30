import { Injectable } from '@nestjs/common';
import { BranchImage } from '../../domain/branch-images/branch-image';
import { BranchImagesRepository } from '../../domain/branch-images/branch-images.repository';
import { DatabaseOperationError, NotFoundError } from '../../domain/errors';
import {
  BranchImage as BranchImageRow,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Ties in order (two concurrent uploads) break by id, so the list order is always stable. */
const ORDER_BY: Prisma.BranchImageOrderByWithRelationInput[] = [
  { order: 'asc' },
  { id: 'asc' },
];

@Injectable()
export class PrismaBranchImagesRepository implements BranchImagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByBranch(branchId: number) {
    return (
      await this.prisma.branchImage
        .findMany({ where: { branchId }, orderBy: ORDER_BY })
        .catch(translateError)
    ).map(toBranchImage);
  }

  async findById(id: number) {
    const row = await this.prisma.branchImage
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toBranchImage(row);
  }

  async append(branchId: number, url: string) {
    return toBranchImage(
      await this.prisma
        .$transaction(async (tx) => {
          // Locks the Sucursal so concurrent uploads queue up instead of reading the same last order.
          await tx.$queryRaw`SELECT 1 FROM "Branch" WHERE "id" = ${branchId} FOR UPDATE`;
          const { _max } = await tx.branchImage.aggregate({
            where: { branchId },
            _max: { order: true },
          });
          return tx.branchImage.create({
            data: { branchId, url, order: (_max.order ?? -1) + 1 },
          });
        })
        .catch(translateError),
    );
  }

  async delete(id: number) {
    await this.prisma.branchImage
      .delete({ where: { id } })
      .catch(translateError);
  }

  async reorder(branchId: number, imageIds: number[]) {
    return (
      await this.prisma
        .$transaction(async (tx) => {
          for (const [order, id] of imageIds.entries())
            await tx.branchImage.update({
              where: { id, branchId },
              data: { order },
            });
          return tx.branchImage.findMany({
            where: { branchId },
            orderBy: ORDER_BY,
          });
        })
        .catch(translateError)
    ).map(toBranchImage);
  }
}

const toBranchImage = (row: BranchImageRow): BranchImage => ({
  id: row.id,
  branchId: row.branchId,
  url: row.url,
  order: row.order,
});

const translateError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  )
    throw new NotFoundError('Image not found', { cause: error });
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
