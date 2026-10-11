import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import {
  OutOfOffice,
  OutOfOfficeFields,
} from '../../domain/out-of-office/out-of-office';
import { OutOfOfficeRepository } from '../../domain/out-of-office/out-of-office.repository';
import {
  OutOfOffice as OutOfOfficeRow,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const toDbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

const toOutOfOffice = (row: OutOfOfficeRow): OutOfOffice => ({
  id: row.id,
  userId: row.userId,
  startDate: fromDbDate(row.startDate),
  endDate: fromDbDate(row.endDate),
  reason: row.reason as OutOfOffice['reason'],
  notes: row.notes,
  showNotePublicly: row.showNotePublicly,
});

const toData = (data: OutOfOfficeFields) => ({
  startDate: toDbDate(data.startDate),
  endDate: toDbDate(data.endDate),
  reason: data.reason,
  notes: data.notes,
  showNotePublicly: data.showNotePublicly,
});

/** Acceso a los períodos Fuera de la oficina del Usuario. */
@Injectable()
export class PrismaOutOfOfficeRepository implements OutOfOfficeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws {DatabaseOperationError} la base falló */
  async listByUserEndingFrom(userId: number, from: string) {
    const rows = await this.prisma.outOfOffice
      .findMany({
        where: { userId, endDate: { gte: toDbDate(from) } },
        orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      })
      .catch(translateError);
    return rows.map(toOutOfOffice);
  }

  async findById(id: number) {
    const row = await this.prisma.outOfOffice
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toOutOfOffice(row);
  }

  async findByUserAndDates(
    userId: number,
    startDate: string,
    endDate: string,
  ) {
    const row = await this.prisma.outOfOffice
      .findUnique({
        where: {
          userId_startDate_endDate: {
            userId,
            startDate: toDbDate(startDate),
            endDate: toDbDate(endDate),
          },
        },
      })
      .catch(translateError);
    return row && toOutOfOffice(row);
  }

  /**
   * @throws {ConflictError} el Usuario ya tiene un período con esas fechas
   * @throws {DatabaseOperationError} la base falló
   */
  async create(userId: number, data: OutOfOfficeFields) {
    return toOutOfOffice(
      await this.prisma.outOfOffice
        .create({ data: { userId, ...toData(data) } })
        .catch(translateError),
    );
  }

  /**
   * @throws {ConflictError} otro período del Usuario tiene esas fechas
   * @throws {NotFoundError} el período no existe
   * @throws {DatabaseOperationError} la base falló
   */
  async update(id: number, data: OutOfOfficeFields) {
    return toOutOfOffice(
      await this.prisma.outOfOffice
        .update({ where: { id }, data: toData(data) })
        .catch(translateError),
    );
  }

  /**
   * @throws {NotFoundError} el período no existe
   * @throws {DatabaseOperationError} la base falló
   */
  async delete(id: number) {
    await this.prisma.outOfOffice
      .delete({ where: { id } })
      .catch(translateError);
  }
}

/** The use cases check the rules first; these are the constraints catching a race. */
const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // The (userId, startDate, endDate) unique index is the only unique one on this table.
    if (error.code === 'P2002')
      throw new ConflictError(
        'Ya hay un período Fuera de la oficina con esas fechas',
        { cause: error },
      );
    if (error.code === 'P2025')
      throw new NotFoundError('Out of office not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
