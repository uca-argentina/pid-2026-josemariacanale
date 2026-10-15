import { Injectable } from '@nestjs/common';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { ConflictError, DatabaseOperationError } from '../../domain/errors';
import {
  AliveWaitlistEntry,
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

  /** @throws {DatabaseOperationError} the query failed */
  async listAliveIncludeService(now: Date): Promise<AliveWaitlistEntry[]> {
    // The widest zone (UTC+14) is ahead of UTC, so a date from yesterday (UTC) may still be today somewhere.
    const yesterday = new Date(now.getTime() - 24 * 3_600_000);
    yesterday.setUTCHours(0, 0, 0, 0);
    const rows = await this.prisma.waitlistEntry
      .findMany({
        where: {
          leftAt: null,
          date: { gte: yesterday },
          service: { deletedAt: null },
        },
        select: {
          ...VIEW_SELECT,
          clientName: true,
          email: true,
          link: true,
          notifiedAt: true,
          createdAt: true,
        },
        orderBy: { id: 'asc' },
      })
      .catch((error) => translateLinkError(error, 'listed'));
    return rows.map((row) => ({
      ...toView(row),
      clientName: row.clientName,
      email: row.email,
      link: row.link,
      notifiedAt: row.notifiedAt,
      leftAt: null,
      createdAt: row.createdAt,
    }));
  }

  /** @throws {DatabaseOperationError} the query failed */
  async listWithLiveBooking(entries: AliveWaitlistEntry[]) {
    if (entries.length === 0) return new Set<number>();
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
        SELECT e."id"
        FROM unnest(
          ${entries.map((e) => e.id)}::int[],
          ${entries.map((e) => e.serviceId)}::int[],
          ${entries.map((e) => e.date)}::date[],
          ${entries.map((e) => e.email)}::text[],
          ${entries.map((e) => e.timeZone)}::text[]
        ) AS e("id", "serviceId", "date", "email", "zone")
        WHERE EXISTS (
          SELECT 1
          FROM "Booking" b
          JOIN "Client" c ON c."bookingId" = b."id"
          WHERE b."serviceId" = e."serviceId"
            AND b."status" IN ('PENDING', 'BOOKED')
            AND lower(c."email") = lower(e."email")
            AND (b."startsAt" AT TIME ZONE e."zone")::date = e."date"
        )`.catch((error) => translateLinkError(error, 'listed'));
    return new Set(rows.map((row) => row.id));
  }

  /** @throws {DatabaseOperationError} the update failed */
  async markNotified(id: number, now: Date) {
    await this.prisma.waitlistEntry
      .update({ where: { id }, data: { notifiedAt: now } })
      .catch((error) => translateLinkError(error, 'saved'));
  }

  /** @throws {DatabaseOperationError} the update failed */
  async rearm(id: number) {
    await this.prisma.waitlistEntry
      .update({ where: { id }, data: { notifiedAt: null } })
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
