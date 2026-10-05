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

/** The Usuario fields the Empleado's view reads instead of storing its own. */
export const WITH_USER = {
  user: { select: { name: true, email: true } },
} satisfies Prisma.EmployeeInclude;

type EmployeeRowWithUser = EmployeeRow & {
  user: Pick<UserRow, 'name' | 'email'>;
};

@Injectable()
export class PrismaEmployeesRepository implements EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByIds(ids: number[]) {
    return (
      await this.prisma.employee
        .findMany({ where: { id: { in: ids } }, include: WITH_USER })
        .catch(translateError)
    ).map(toEmployee);
  }

  async create(data: CreateEmployeeData) {
    return toEmployee(
      await this.prisma.employee
        .create({ data, include: WITH_USER })
        .catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.employee
      .findUnique({ where: { id }, include: WITH_USER })
      .catch(translateError);
    return row && toEmployee(row);
  }

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  async listActiveByUser(userId: number) {
    return (
      await this.prisma.employee
        .findMany({ where: { userId, retiredAt: null }, include: WITH_USER })
        .catch(translateError)
    ).map(toEmployee);
  }

  async listActiveByBusiness(businessId: number) {
    return (
      await this.prisma.employee
        .findMany({
          where: { businessId, retiredAt: null },
          include: WITH_USER,
        })
        .catch(translateError)
    ).map(toEmployee);
  }

  async retire(id: number, retiredAt: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        const row = await tx.employee.update({
          where: { id },
          data: { retiredAt, services: { deleteMany: {} } },
          include: WITH_USER,
        });
        const cancelledBookings = await cancelFutureBooked(
          tx,
          { employeeId: id },
          retiredAt,
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
  retiredAt: row.retiredAt,
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
