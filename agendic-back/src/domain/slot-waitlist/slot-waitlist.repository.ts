import {
  AcceptedOfferStatus,
  CreateSlotWaitlistEntryInput,
  FreedSlot,
  OfferHold,
  SlotWaitlistEntry,
  SlotWaitlistEntryDetail,
} from './slot-waitlist-entry';

export const SLOT_WAITLIST_REPOSITORY = Symbol('SlotWaitlistRepository');

export interface SlotWaitlistRepository {
  create(input: CreateSlotWaitlistEntryInput): Promise<SlotWaitlistEntry>;
  findAlive(
    serviceId: number,
    employeeId: number | null,
    startsAt: Date,
    email: string,
  ): Promise<SlotWaitlistEntry | null>;
  findByLink(link: string): Promise<SlotWaitlistEntryDetail | null>;
  findFirstEligible(
    serviceId: number,
    employeeId: number | null,
    startsAt: Date,
  ): Promise<SlotWaitlistEntry | null>;
  // Returns false when another request offered this Anotación first.
  createOffer(
    entry: SlotWaitlistEntry,
    hold: OfferHold,
    now: Date,
  ): Promise<boolean>;
  // Both release the offer's hold if it had a live one, and return the horario it freed.
  expireOffer(id: number, now: Date): Promise<FreedSlot | null>;
  leave(id: number, now: Date): Promise<FreedSlot | null>;
  // Null when the offer was no longer open at write time (expired, left or accepted in between).
  accept(
    id: number,
    status: AcceptedOfferStatus,
    now: Date,
    offeredAfter: Date,
  ): Promise<string | null>;
}
