import {
  SlotWaitlistEntry,
  CreateSlotWaitlistEntryInput,
} from './slot-waitlist-entry';

export const SLOT_WAITLIST_REPOSITORY = Symbol('SlotWaitlistRepository');

export interface SlotWaitlistRepository {
  create(input: CreateSlotWaitlistEntryInput): Promise<SlotWaitlistEntry>;
}
