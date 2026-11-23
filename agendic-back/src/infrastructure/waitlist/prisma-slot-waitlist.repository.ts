import { Injectable } from '@nestjs/common';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { BookingStatus } from '../../domain/bookings/booking';
import { DatabaseOperationError } from '../../domain/errors';
import { SlotWaitlistRepository } from '../../domain/slot-waitlist/slot-waitlist.repository';
import {
  AcceptedOfferStatus,
  CreateSlotWaitlistEntryInput,
  FreedSlot,
  OfferHold,
  SlotWaitlistEntry,
  SlotWaitlistEntryDetail,
} from '../../domain/slot-waitlist/slot-waitlist-entry';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { generateSecretLink } from '../secret-link';

@Injectable()
export class PrismaSlotWaitlistRepository implements SlotWaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSlotWaitlistEntryInput) {
    return this.prisma.slotWaitlistEntry
      .create({ data: { ...input, link: generateSecretLink() } })
      .catch((error: unknown) =>
        fail(
          `Anotación for ${input.email} at ${input.startsAt.toISOString()} in Service ${input.serviceId} not saved`,
          error,
        ),
      );
  }

  async findAlive(
    serviceId: number,
    employeeId: number | null,
    startsAt: Date,
    email: string,
  ) {
    return this.prisma.slotWaitlistEntry
      .findFirst({
        where: {
          serviceId,
          employeeId,
          startsAt,
          email: { equals: email, mode: 'insensitive' },
          leftAt: null,
          expiredAt: null,
          acceptedAt: null,
        },
      })
      .catch((error: unknown) =>
        fail(
          `Anotación for ${email} at ${startsAt.toISOString()} in Service ${serviceId} not read`,
          error,
        ),
      );
  }

  async findByLink(link: string): Promise<SlotWaitlistEntryDetail | null> {
    const row = await this.prisma.slotWaitlistEntry
      .findUnique({ where: { link }, select: DETAIL_SELECT })
      .catch((error: unknown) => fail('Anotación by link not read', error));
    return row && toDetail(row);
  }

  async findFirstEligible(
    serviceId: number,
    employeeId: number | null,
    startsAt: Date,
  ) {
    return this.prisma.slotWaitlistEntry
      .findFirst({
        where: {
          serviceId,
          startsAt,
          // Whoever asked for the freed Empleado, or for anyone.
          OR: [{ employeeId }, { employeeId: null }],
          offeredAt: null,
          leftAt: null,
          acceptedAt: null,
          expiredAt: null,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
      .catch((error: unknown) =>
        fail(
          `Next Anotación at ${startsAt.toISOString()} in Service ${serviceId} not read`,
          error,
        ),
      );
  }

  async createOffer(entry: SlotWaitlistEntry, hold: OfferHold, now: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        // Claiming the Anotación first makes a second concurrent offer of it a no-op.
        const { count } = await tx.slotWaitlistEntry.updateMany({
          where: { id: entry.id, offeredAt: null, leftAt: null },
          data: { offeredAt: now },
        });
        if (count === 0) return false;
        const booking = await tx.booking.create({
          select: { id: true },
          data: {
            ...hold,
            serviceId: entry.serviceId,
            startsAt: entry.startsAt,
            employeeChosen: entry.employeeId !== null,
            status: BookingStatus.OFFERED,
            link: generateSecretLink(),
            client: {
              create: {
                name: entry.clientName,
                email: entry.email.trim().toLowerCase(),
              },
            },
          },
        });
        await tx.slotWaitlistEntry.update({
          where: { id: entry.id },
          data: { offerBookingId: booking.id },
        });
        return true;
      })
      .catch((error: unknown) =>
        fail(`Offer to Anotación ${entry.id} not saved`, error),
      );
  }

  async expireOffer(id: number, now: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        const rows = await tx.slotWaitlistEntry.updateManyAndReturn({
          where: {
            id,
            offeredAt: { not: null },
            acceptedAt: null,
            expiredAt: null,
            leftAt: null,
          },
          data: { expiredAt: now },
          select: { offerBookingId: true },
        });
        return rows.length === 0 ? null : releaseHold(tx, rows[0].offerBookingId);
      })
      .catch((error: unknown) =>
        fail(`Offer to Anotación ${id} not expired`, error),
      );
  }

  async leave(id: number, now: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        const rows = await tx.slotWaitlistEntry.updateManyAndReturn({
          where: { id, leftAt: null, acceptedAt: null },
          data: { leftAt: now },
          select: { offerBookingId: true, expiredAt: true },
        });
        if (rows.length === 0 || rows[0].expiredAt !== null) return null;
        return releaseHold(tx, rows[0].offerBookingId);
      })
      .catch((error: unknown) =>
        fail(`Anotación ${id} not left`, error),
      );
  }

  async accept(
    id: number,
    status: AcceptedOfferStatus,
    now: Date,
    offeredAfter: Date,
  ) {
    return this.prisma
      .$transaction(async (tx) => {
        // The time guard sits in the WHERE so an offer that lapses between the read and this write is never accepted.
        const rows = await tx.slotWaitlistEntry.updateManyAndReturn({
          where: {
            id,
            offeredAt: { gt: offeredAfter },
            offerBookingId: { not: null },
            acceptedAt: null,
            expiredAt: null,
            leftAt: null,
          },
          data: { acceptedAt: now },
          select: { offerBookingId: true },
        });
        if (rows.length === 0) return null;
        const booking = await tx.booking.update({
          where: { id: rows[0].offerBookingId!, status: BookingStatus.OFFERED },
          data: {
            status,
            acceptedAt: status === BookingStatus.BOOKED ? now : null,
          },
          select: { link: true },
        });
        return booking.link;
      })
      .catch((error: unknown) =>
        fail(`Offer to Anotación ${id} not accepted`, error),
      );
  }
}

// Deleting the OFFERED Turno rather than cancelling it keeps an offer nobody took out of the panel and the stats.
const releaseHold = async (
  tx: Prisma.TransactionClient,
  bookingId: number | null,
): Promise<FreedSlot | null> => {
  if (bookingId === null) return null;
  const hold = await tx.booking.findFirst({
    where: { id: bookingId, status: BookingStatus.OFFERED },
    select: { serviceId: true, employeeId: true, startsAt: true },
  });
  if (!hold) return null;
  await tx.booking.delete({ where: { id: bookingId } });
  return hold;
};

const DETAIL_SELECT = {
  id: true,
  serviceId: true,
  employeeId: true,
  startsAt: true,
  clientName: true,
  email: true,
  link: true,
  offerBookingId: true,
  createdAt: true,
  offeredAt: true,
  acceptedAt: true,
  leftAt: true,
  expiredAt: true,
  booking: { select: { link: true } },
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
} satisfies Prisma.SlotWaitlistEntrySelect;

const toDetail = (
  row: Prisma.SlotWaitlistEntryGetPayload<{ select: typeof DETAIL_SELECT }>,
): SlotWaitlistEntryDetail => {
  const { service, booking, ...entry } = row;
  const { branch } = service;
  return {
    ...entry,
    // A personal Service dado de baja has lost its Availability: it falls back to the Usuario's default one.
    timeZone: branch
      ? branch.timeZone
      : ((service.availability ?? service.user?.availabilities[0])?.timeZone ??
        DEFAULT_AVAILABILITY.timeZone),
    service: { name: service.name, slug: service.slug },
    business: branch
      ? { name: branch.business.name, slug: branch.business.slug }
      : null,
    branch: branch ? { name: branch.name, slug: branch.slug } : null,
    user: branch || !service.user ? null : { slug: service.user.slug },
    bookingLink: booking?.link ?? null,
  };
};

const fail = (message: string, error: unknown): never => {
  throw new DatabaseOperationError(message, { cause: error });
};
