import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors';
import { SlotWaitlistEntryView } from '../../domain/slot-waitlist/slot-waitlist-entry';
import {
  SlotWaitlistRepository,
  SLOT_WAITLIST_REPOSITORY,
} from '../../domain/slot-waitlist/slot-waitlist.repository';

@Injectable()
export class GetSlotWaitlistEntryByLinkUseCase {
  constructor(
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
  ) {}

  /** @throws {NotFoundError} el enlace no corresponde a ninguna Anotación */
  async execute(
    link: string,
  ): Promise<Omit<SlotWaitlistEntryView, 'id' | 'serviceId'>> {
    const entry = await this.waitlist.findByLinkIncludeService(link);
    if (!entry) throw new NotFoundError('Anotación not found');
    const { id, serviceId, ...view } = entry;
    return view;
  }
}
