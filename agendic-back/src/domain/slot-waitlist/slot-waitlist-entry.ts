import { Booking, BookingStatus } from '../bookings/booking';
import { CreateBookingData } from '../bookings/bookings.repository';

// The freed horario is held for the first Anotación in line for this long; past it, it goes to the next one.
export const OFFER_MINUTES = 15;

export enum SlotWaitlistStatus {
  WAITING = 'WAITING',
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  LEFT = 'LEFT',
}

export interface CreateSlotWaitlistEntryInput {
  clientName: string;
  email: string;
  employeeId: number | null;
  serviceId: number;
  startsAt: Date;
}

export interface SlotWaitlistEntry {
  id: number;
  serviceId: number;
  employeeId: number | null;
  startsAt: Date;
  clientName: string;
  email: string;
  link: string;
  offerBookingId: number | null;
  createdAt: Date;
  offeredAt: Date | null;
  acceptedAt: Date | null;
  leftAt: Date | null;
  expiredAt: Date | null;
}

export interface SlotWaitlistEntryDetail extends SlotWaitlistEntry {
  timeZone: string;
  service: { name: string; slug: string };
  business: { name: string; slug: string } | null;
  branch: { name: string; slug: string } | null;
  user: { slug: string | null } | null;
  bookingLink: string | null;
}

export interface SlotWaitlistEntryView {
  startsAt: string;
  timeZone: string;
  status: SlotWaitlistStatus;
  offerExpiresAt: string | null;
  bookingLink: string | null;
  service: { name: string; slug: string };
  business: { name: string; slug: string } | null;
  branch: { name: string; slug: string } | null;
  user: { slug: string | null } | null;
}

export type OfferHold = Pick<
  CreateBookingData,
  | 'employeeId'
  | 'userId'
  | 'cabinId'
  | 'prepStartsAt'
  | 'endsAt'
  | 'price'
  | 'depositAmount'
>;

export type FreedSlot = Pick<Booking, 'serviceId' | 'employeeId' | 'startsAt'>;

export type AcceptedOfferStatus = BookingStatus.PENDING | BookingStatus.BOOKED;

export const offerExpiresAt = (offeredAt: Date) =>
  new Date(offeredAt.getTime() + OFFER_MINUTES * 60_000);

export const slotWaitlistStatusOf = (
  entry: Pick<
    SlotWaitlistEntry,
    'offeredAt' | 'acceptedAt' | 'leftAt' | 'expiredAt' | 'offerBookingId'
  >,
): SlotWaitlistStatus => {
  if (entry.acceptedAt) return SlotWaitlistStatus.ACCEPTED;
  if (entry.leftAt) return SlotWaitlistStatus.LEFT;
  // An offer whose hold was deleted (a baja took its horario) is over too, though nobody marked it expired.
  if (entry.expiredAt || (entry.offeredAt && entry.offerBookingId === null))
    return SlotWaitlistStatus.EXPIRED;
  if (entry.offeredAt) return SlotWaitlistStatus.OFFERED;
  return SlotWaitlistStatus.WAITING;
};

export const isOfferLapsed = (entry: SlotWaitlistEntry, now: Date) =>
  slotWaitlistStatusOf(entry) === SlotWaitlistStatus.OFFERED &&
  now >= offerExpiresAt(entry.offeredAt!);

export const toSlotWaitlistEntryView = (
  entry: SlotWaitlistEntryDetail,
): SlotWaitlistEntryView => {
  const status = slotWaitlistStatusOf(entry);
  return {
    startsAt: entry.startsAt.toISOString(),
    timeZone: entry.timeZone,
    status,
    offerExpiresAt:
      status === SlotWaitlistStatus.OFFERED
        ? offerExpiresAt(entry.offeredAt!).toISOString()
        : null,
    bookingLink:
      status === SlotWaitlistStatus.ACCEPTED ? entry.bookingLink : null,
    service: entry.service,
    business: entry.business,
    branch: entry.branch,
    user: entry.user,
  };
};

// API contract (ADR 0007): the front tells an expired offer apart by this prefix.
export const offerExpired = (expiresAt: Date) =>
  `Offer expired at ${expiresAt.toISOString()}`;
