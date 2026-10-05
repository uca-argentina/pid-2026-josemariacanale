import { Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BusinessesRepository,
  CreateBusinessData,
} from '../../domain/businesses/businesses.repository';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Business as BusinessRow, Prisma } from '../../generated/prisma/client';
import { toBranch } from '../branches/prisma-branches.repository';
import {
  toEmployee,
  WITH_USER,
} from '../employees/prisma-employees.repository';
import {
  toService,
  VISIBLE_EMPLOYEES,
} from '../services/prisma-services.repository';
import { violatedIndex } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaBusinessesRepository implements BusinessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One interactive transaction rather than a nested create: the Servicio links the Empleado with their
   * Availability, and none of those ids exists until its row is written.
   */
  async create(data: CreateBusinessData) {
    return this.prisma
      .$transaction(async (tx) => {
        const business = await tx.business.create({ data: data.business });
        const branch = await tx.branch.create({
          data: {
            businessId: business.id,
            name: data.branch.name,
            address: data.branch.address,
            timeZone: data.branch.timeZone,
            slug: data.branch.slug,
          },
        });
        const employee = await tx.employee.create({
          data: { businessId: business.id, ...data.employee },
          include: WITH_USER,
        });
        const availability = await tx.availability.findFirstOrThrow({
          where: { userId: data.employee.userId, isDefault: true },
          select: { id: true },
        });
        const service = await tx.service.create({
          data: {
            branchId: branch.id,
            ...data.service,
            employees: {
              create: {
                employeeId: employee.id,
                availabilityId: availability.id,
              },
            },
          },
          include: VISIBLE_EMPLOYEES,
        });
        return {
          business: toBusiness(business),
          branch: toBranch(branch),
          service: toService(service),
          employee: toEmployee(employee),
        };
      })
      .catch(translateError);
  }

  async findById(id: number) {
    const row = await this.prisma.business
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toBusiness(row);
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.business
      .findUnique({ where: { slug } })
      .catch(translateError);
    return row && toBusiness(row);
  }

  async listByOwner(ownerId: number) {
    return (
      await this.prisma.business
        .findMany({ where: { ownerId } })
        .catch(translateError)
    ).map(toBusiness);
  }

  async update(
    id: number,
    data: Partial<Pick<Business, 'name' | 'description' | 'slug'>>,
  ) {
    return toBusiness(
      await this.prisma.business
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }
}

const toBusiness = (row: BusinessRow): Business => ({
  id: row.id,
  name: row.name,
  description: row.description,
  ownerId: row.ownerId,
  slug: row.slug,
});

const CONFLICT_BY_INDEX: Record<string, string> = {
  Business_slug_key: 'Booking link already in use',
  Business_ownerId_key: 'Ya tenés un Negocio',
  Service_branchId_name_ci_key: 'Service name already in use',
  Service_branchId_slug_key: 'Service booking link already in use',
  Employee_userId_businessId_key:
    'User already an active Employee of this Business',
};

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError(
        CONFLICT_BY_INDEX[violatedIndex(error) ?? ''] ??
          'Service name already in use, or User already an active Employee of this Business',
        { cause: error },
      );
    if (error.code === 'P2025')
      throw new NotFoundError('Business not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
