import { Injectable } from '@nestjs/common';
import {
  Branch,
  CreateBranchInput,
  MapPoint,
  UpdateBranchInput,
} from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { toBranchImage } from '../branch-images/prisma-branch-images.repository';
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

  async createWithImages(
    data: CreateBranchInput & Pick<Branch, 'businessId'>,
    imageUrls: string[],
    employeeIds: number[],
  ) {
    const row = await this.prisma.branch
      .create({
        data: {
          businessId: data.businessId,
          name: data.name,
          address: data.address,
          timeZone: data.timeZone,
          slug: data.slug,
          description: data.description,
          ...toPointColumns(data.location),
          images: {
            create: imageUrls.map((url, order) => ({ url, order })),
          },
          employees: {
            create: employeeIds.map((employeeId) => ({ employeeId })),
          },
        },
        include: {
          images: {
            select: { id: true, branchId: true, url: true, order: true },
            orderBy: { order: 'asc' },
          },
        },
      })
      .catch(translateError);
    return { branch: toBranch(row), images: row.images.map(toBranchImage) };
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

  async update(id: number, data: UpdateBranchInput) {
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
            ...toPointColumns(data.location),
          },
        })
        .catch(translateError),
    );
  }
}

export const toTime = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
export const fromTime = (date: Date) => date.toISOString().slice(11, 16);

/** The two columns that store a Sucursal's point; no point leaves both `undefined`, so an update keeps them. */
export const toPointColumns = (point: MapPoint | undefined) => ({
  latitude: point?.lat,
  longitude: point?.lng,
});

export const toBranch = (row: BranchRow): Branch => ({
  id: row.id,
  businessId: row.businessId,
  name: row.name,
  address: row.address,
  timeZone: row.timeZone,
  slug: row.slug,
  description: row.description,
  // The CHECK Branch_location_both_or_neither keeps the two in step: one null means both are.
  location:
    row.latitude === null || row.longitude === null
      ? null
      : { lat: row.latitude, lng: row.longitude },
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
