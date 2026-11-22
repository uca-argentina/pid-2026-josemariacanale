import { SlotWaitlistEntryView } from './slot-waitlist-entry';
import {
  SlotWaitlistEntry,
  CreateSlotWaitlistEntryInput,
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
  findByLinkIncludeService(link: string): Promise<SlotWaitlistEntryView | null>;
  leave(id: number, now: Date): Promise<void>;
}
