import { Inject, Injectable } from '@nestjs/common';
import { BookingStatus } from '../../domain/bookings/booking';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  AcceptedOfferStatus,
  OFFER_MINUTES,
  offerExpired,
  offerExpiresAt,
  slotWaitlistStatusOf,
  SlotWaitlistStatus,
} from '../../domain/slot-waitlist/slot-waitlist-entry';
import {
  SLOT_WAITLIST_REPOSITORY,
  SlotWaitlistRepository,
} from '../../domain/slot-waitlist/slot-waitlist.repository';
import { expireIfLapsed, findSlotWaitlistEntry } from './find-slot-waitlist-entry';
import { OfferFreedSlotUseCase } from './offer-freed-slot.use-case';

@Injectable()
export class AcceptSlotOfferUseCase {
  constructor(
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly offers: OfferFreedSlotUseCase,
  ) {}

  // The held Turno keeps the Seña fixed when it was offered; the Cliente pays it from the returned Enlace del Turno,
  // as with any other booking.
  async execute(
    link: string,
  ): Promise<{ bookingLink: string; status: AcceptedOfferStatus }> {
    const now = this.clock.now();
    const entry = await findSlotWaitlistEntry(this.waitlist, link);
    const service = await this.services.findById(entry.serviceId);
    if (!service)
      throw new NotFoundError(`Service ${entry.serviceId} not found`);
    const status = service.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.BOOKED;

    const current = slotWaitlistStatusOf(entry);
    // Accepting twice (a double click, a retry) answers the same Turno.
    if (current === SlotWaitlistStatus.ACCEPTED && entry.bookingLink)
      return { bookingLink: entry.bookingLink, status };
    if (await expireIfLapsed(this.waitlist, this.offers, entry, now))
      throw new BusinessRuleError(offerExpired(offerExpiresAt(entry.offeredAt!)));
    if (current !== SlotWaitlistStatus.OFFERED)
      throw new BusinessRuleError(
        `Anotación ${entry.id} has no open offer: it is ${current}`,
      );

    const bookingLink = await this.waitlist.accept(
      entry.id,
      status,
      now,
      new Date(now.getTime() - OFFER_MINUTES * 60_000),
    );
    if (!bookingLink)
      throw new ConflictError(
        `Offer to Anotación ${entry.id} changed while accepting it`,
      );
    return { bookingLink, status };
  }
}
