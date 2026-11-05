import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/employees/employee';
import {
  CreateEmployeeData,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import {
  Employee as EmployeeRow,
  Prisma,
  User as UserRow,
} from '../../generated/prisma/client';
import { cancelFutureBooked } from '../bookings/cancel-future-booked';
import { PrismaService } from '../prisma.service';

/** The Usuario fields the Empleado's view reads instead of storing its own, and the Sucursales where they trabajan. */
export const EMPLOYEE_RELATIONS = {
  user: { select: { name: true, email: true, imageUrl: true } },
  branches: { select: { branchId: true }, orderBy: { branchId: 'asc' } },
} satisfies Prisma.EmployeeInclude;

type EmployeeRowWithUser = EmployeeRow & {
  user: Pick<UserRow, 'name' | 'email' | 'imageUrl'>;
  branches: { branchId: number }[];
};

@Injectable()
export class PrismaEmployeesRepository implements EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByIds(ids: number[]) {
    return (
      await this.prisma.employee
        .findMany({ where: { id: { in: ids } }, include: EMPLOYEE_RELATIONS })
        .catch(translateError)
    ).map(toEmployee);
  }

  async create({ userId, businessId, branchIds }: CreateEmployeeData) {
    return toEmployee(
      await this.prisma.employee
        .create({
          data: {
            userId,
            businessId,
            branches: {
              create: branchIds.map((branchId) => ({ branchId })),
            },
          },
          include: EMPLOYEE_RELATIONS,
        })
        .catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.employee
      .findUnique({ where: { id }, include: EMPLOYEE_RELATIONS })
      .catch(translateError);
    return row && toEmployee(row);
  }

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  async listActiveByUser(userId: number) {
    return (
      await this.prisma.employee
        .findMany({ where: { userId, deletedAt: null }, include: EMPLOYEE_RELATIONS })
        .catch(translateError)
    ).map(toEmployee);
  }

  async listActiveByBusiness(businessId: number) {
    return (
      await this.prisma.employee
        .findMany({
          where: { businessId, deletedAt: null },
          include: EMPLOYEE_RELATIONS,
        })
        .catch(translateError)
    ).map(toEmployee);
  }

  async retire(id: number, deletedAt: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        const row = await tx.employee.update({
          where: { id },
          data: { deletedAt, services: { deleteMany: {} } },
          include: EMPLOYEE_RELATIONS,
        });
        const cancelledBookings = await cancelFutureBooked(
          tx,
          { employeeId: id },
          deletedAt,
        );
        return { employee: toEmployee(row), cancelledBookings };
      })
      .catch(translateError);
  }
}

export const toEmployee = (row: EmployeeRowWithUser): Employee => ({
  id: row.id,
  userId: row.userId,
  businessId: row.businessId,
  name: row.user.name,
  email: row.user.email,
  imageUrl: row.user.imageUrl,
  deletedAt: row.deletedAt,
  branchIds: row.branches.map(({ branchId }) => branchId),
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError(
        'User already an active Employee of this Business',
        { cause: error },
      );
    if (error.code === 'P2025')
      throw new NotFoundError('Employee not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
