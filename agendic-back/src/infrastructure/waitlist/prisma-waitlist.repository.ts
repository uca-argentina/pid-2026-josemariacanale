import { Injectable } from '@nestjs/common';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { ConflictError, DatabaseOperationError } from '../../domain/errors';
import {
  CreateWaitlistEntryInput,
  WaitlistEntry,
  WaitlistEntryView,
} from '../../domain/waitlist/waitlist-entry';
import { WaitlistRepository } from '../../domain/waitlist/waitlist.repository';
import {
  Prisma,
  WaitlistEntry as WaitlistEntryRow,
} from '../../generated/prisma/client';
import { violatedIndex } from '../prisma-errors';
import { PrismaService } from '../prisma.service';
import { generateSecretLink } from '../secret-link';

const ALIVE_ENTRY_UNIQUE = 'WaitlistEntry_email_service_date_key';

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
            link: generateSecretLink(),
          },
        })
        .catch((error) =>
          translateError(error, input.serviceId, input.date, input.email),
        ),
    );
  }

  /** @throws {DatabaseOperationError} the query failed */
  async findByLinkIncludeService(
    link: string,
  ): Promise<WaitlistEntryView | null> {
    const row = await this.prisma.waitlistEntry
      .findUnique({ where: { link }, select: VIEW_SELECT })
      .catch((error) => translateLinkError(error, 'read'));
    return row && toView(row);
  }

  /** @throws {DatabaseOperationError} the update failed */
  async leave(id: number, now: Date) {
    await this.prisma.waitlistEntry
      .updateMany({ where: { id, leftAt: null }, data: { leftAt: now } })
      .catch((error) => translateLinkError(error, 'saved'));
  }
}

const VIEW_SELECT = {
  id: true,
  serviceId: true,
  date: true,
  leftAt: true,
  service: {
    select: {
      name: true,
      slug: true,
      availability: { select: { timeZone: true } },
      user: {
        select: {
          slug: true,
          availabilities: {
            where: { isDefault: true },
            select: { timeZone: true },
            take: 1,
          },
        },
      },
      branch: {
        select: {
          name: true,
          slug: true,
          timeZone: true,
          business: { select: { name: true, slug: true } },
        },
      },
    },
  },
} satisfies Prisma.WaitlistEntrySelect;

const toView = (
  row: Prisma.WaitlistEntryGetPayload<{ select: typeof VIEW_SELECT }>,
): WaitlistEntryView => {
  const { service } = row;
  const { branch } = service;
  return {
    id: row.id,
    serviceId: row.serviceId,
    date: row.date.toISOString().slice(0, 10),
    // A personal Service dado de baja has lost its Availability: it falls back to the Usuario's default one.
    timeZone: branch
      ? branch.timeZone
      : ((service.availability ?? service.user?.availabilities[0])?.timeZone ??
        DEFAULT_AVAILABILITY.timeZone),
    left: row.leftAt !== null,
    service: { name: service.name, slug: service.slug },
    business: branch
      ? { name: branch.business.name, slug: branch.business.slug }
      : null,
    branch: branch ? { name: branch.name, slug: branch.slug } : null,
    user: branch || !service.user ? null : { slug: service.user.slug },
  };
};

const translateLinkError = (error: unknown, action: string): never => {
  throw new DatabaseOperationError(`Waitlist entry not ${action}`, {
    cause: error,
  });
};

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
    violatedIndex(error) === ALIVE_ENTRY_UNIQUE
  )
    throw new ConflictError(
      `Waitlist entry for ${email} on ${date} in Service ${serviceId} already exists`,
      { cause: error },
    );
  throw new DatabaseOperationError(
    `Waitlist entry for ${email} on ${date} in Service ${serviceId} not saved or read`,
    {
      cause: error,
    },
  );
};
