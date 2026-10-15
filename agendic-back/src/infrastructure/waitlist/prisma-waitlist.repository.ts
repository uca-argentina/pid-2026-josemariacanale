import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConflictError, DatabaseOperationError } from '../../domain/errors';
import {
  CreateWaitlistEntryInput,
  WaitlistEntry,
} from '../../domain/waitlist/waitlist-entry';
import { WaitlistRepository } from '../../domain/waitlist/waitlist.repository';
import {
  Prisma,
  WaitlistEntry as WaitlistEntryRow,
} from '../../generated/prisma/client';
import { violatedIndex } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

const ALIVE_UNIQUE = 'WaitlistEntry_email_service_date_key';

/** Acceso a Anotaciones contra Postgres. */
@Injectable()
export class PrismaWaitlistRepository implements WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws {DatabaseOperationError} the query failed */
  async findAlive(serviceId: number, date: string, email: string) {
    const row = await this.prisma.waitlistEntry
      .findFirst({
        where: {
          serviceId,
          date: new Date(date),
          email: { equals: email, mode: 'insensitive' },
          leftAt: null,
        },
      })
      .catch((error) => translateError(error, serviceId, date, email));
    return row && toEntry(row);
  }

  /**
   * @throws {ConflictError} ya hay una viva de ese email, Servicio y fecha
   * @throws {DatabaseOperationError} the insert failed
   */
  async create(input: CreateWaitlistEntryInput) {
    return toEntry(
      await this.prisma.waitlistEntry
        .create({
          data: {
            serviceId: input.serviceId,
            date: new Date(input.date),
            clientName: input.clientName,
            email: input.email,
            link: generateWaitlistLink(),
          },
        })
        .catch((error) =>
          translateError(error, input.serviceId, input.date, input.email),
        ),
    );
  }
}

const generateWaitlistLink = (): string => randomBytes(32).toString('base64url');

const toEntry = (row: WaitlistEntryRow): WaitlistEntry => ({
  id: row.id,
  serviceId: row.serviceId,
  date: row.date.toISOString().slice(0, 10),
  clientName: row.clientName,
  email: row.email,
  link: row.link,
  notifiedAt: row.notifiedAt,
  leftAt: row.leftAt,
  createdAt: row.createdAt,
});

const translateError = (
  error: unknown,
  serviceId: number,
  date: string,
  email: string,
): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    violatedIndex(error) === ALIVE_UNIQUE
  )
    throw new ConflictError(
      `Waitlist entry for ${email} on ${date} in Service ${serviceId} already exists`,
      { cause: error },
    );
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
