import { Inject, Injectable, Logger } from '@nestjs/common';
import { SLOT_WAITLIST_REPOSITORY } from '../../domain/slot-waitlist/slot-waitlist.repository';
import { SlotWaitlistRepository } from '../../domain/slot-waitlist/slot-waitlist.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';

@Injectable()
export class LeaveSlotWaitlistUseCase {
  constructor(
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}
  async execute(link: string): Promise<void> {
    const entry = await this.waitlist.findByLinkIncludeService(link);
    if (!entry) throw new NotFoundError('Anotación not found');
    if (!entry.left) await this.waitlist.leave(entry.id, this.clock.now());
  }
}
