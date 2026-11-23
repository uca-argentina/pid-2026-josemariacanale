import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError } from '../../domain/errors';
import {
  SLOT_WAITLIST_REPOSITORY,
  SlotWaitlistRepository,
} from '../../domain/slot-waitlist/slot-waitlist.repository';
import { findSlotWaitlistEntry } from './find-slot-waitlist-entry';
import { OfferFreedSlotUseCase } from './offer-freed-slot.use-case';

@Injectable()
export class LeaveSlotWaitlistUseCase {
  constructor(
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly offers: OfferFreedSlotUseCase,
  ) {}

  async execute(link: string): Promise<void> {
    const entry = await findSlotWaitlistEntry(this.waitlist, link);
    if (entry.acceptedAt)
      throw new BusinessRuleError(
        `Anotación ${entry.id} already accepted its offer: cancel the Turno instead`,
      );
    if (entry.leftAt) return;
    // Leaving with an offer in hand gives the horario to the next in line right away.
    const freed = await this.waitlist.leave(entry.id, this.clock.now());
    if (freed) await this.offers.execute(freed);
  }
}
