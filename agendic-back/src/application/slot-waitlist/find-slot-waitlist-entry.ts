import { NotFoundError } from '../../domain/errors';
import {
  isOfferLapsed,
  SlotWaitlistEntryDetail,
} from '../../domain/slot-waitlist/slot-waitlist-entry';
import { SlotWaitlistRepository } from '../../domain/slot-waitlist/slot-waitlist.repository';
import { OfferFreedSlotUseCase } from './offer-freed-slot.use-case';

export async function findSlotWaitlistEntry(
  waitlist: SlotWaitlistRepository,
  link: string,
): Promise<SlotWaitlistEntryDetail> {
  const entry = await waitlist.findByLink(link);
  if (!entry) throw new NotFoundError('Anotación not found');
  return entry;
}

// There is no scheduled job: a lapsed offer is expired, and passed on to the next in line, when someone opens or
// accepts it. Returns whether it had lapsed, even if a concurrent request did the expiring.
export async function expireIfLapsed(
  waitlist: SlotWaitlistRepository,
  offers: OfferFreedSlotUseCase,
  entry: SlotWaitlistEntryDetail,
  now: Date,
): Promise<boolean> {
  if (!isOfferLapsed(entry, now)) return false;
  const freed = await waitlist.expireOffer(entry.id, now);
  if (freed) await offers.execute(freed);
  return true;
}
