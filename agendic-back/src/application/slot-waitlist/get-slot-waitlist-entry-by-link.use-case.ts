import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  SlotWaitlistEntryView,
  toSlotWaitlistEntryView,
} from '../../domain/slot-waitlist/slot-waitlist-entry';
import {
  SLOT_WAITLIST_REPOSITORY,
  SlotWaitlistRepository,
} from '../../domain/slot-waitlist/slot-waitlist.repository';
import { expireIfLapsed, findSlotWaitlistEntry } from './find-slot-waitlist-entry';
import { OfferFreedSlotUseCase } from './offer-freed-slot.use-case';

@Injectable()
export class GetSlotWaitlistEntryByLinkUseCase {
  constructor(
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly offers: OfferFreedSlotUseCase,
  ) {}

  async execute(link: string): Promise<SlotWaitlistEntryView> {
    const entry = await findSlotWaitlistEntry(this.waitlist, link);
    if (await expireIfLapsed(this.waitlist, this.offers, entry, this.clock.now()))
      return toSlotWaitlistEntryView(
        await findSlotWaitlistEntry(this.waitlist, link),
      );
    return toSlotWaitlistEntryView(entry);
  }
}
