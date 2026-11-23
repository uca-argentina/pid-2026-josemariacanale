import { Inject, Injectable, Logger } from '@nestjs/common';
import { depositAmountFor } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { FreedSlot } from '../../domain/slot-waitlist/slot-waitlist-entry';
import {
  SLOT_WAITLIST_REPOSITORY,
  SlotWaitlistRepository,
} from '../../domain/slot-waitlist/slot-waitlist.repository';
import { pickCabin } from '../bookings/pick-cabin';
import { pickEmployee } from '../bookings/pick-employee';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';

const logger = new Logger('OfferFreedSlot');

@Injectable()
export class OfferFreedSlotUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  // Never throws: whatever freed the horario (a cancellation, an expired offer) already happened and must not fail.
  async execute(freed: FreedSlot): Promise<void> {
    try {
      await this.offer(freed);
    } catch (error) {
      logger.error(
        `Offer of Service ${freed.serviceId} at ${freed.startsAt.toISOString()} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async offer(freed: FreedSlot): Promise<void> {
    const now = this.clock.now();
    if (freed.startsAt <= now) return;
    const service = await this.services.findById(freed.serviceId);
    if (!service || service.deletedAt) return;

    const entry = await this.waitlist.findFirstEligible(
      freed.serviceId,
      freed.employeeId,
      freed.startsAt,
    );
    if (!entry) return;

    const { startsAt } = freed;
    const endsAt = new Date(
      startsAt.getTime() + service.durationMinutes * 60_000,
    );
    const prepStartsAt = new Date(
      startsAt.getTime() - service.prepMinutes * 60_000,
    );
    const attendant = await pickEmployee(
      this.listSlots,
      this.bookings,
      service.id,
      startsAt,
      {
        chosenEmployeeId: entry.employeeId ?? undefined,
        keepEmployeeId: freed.employeeId ?? undefined,
      },
    );
    const cabinId = await pickCabin(
      this.bookings,
      service,
      startsAt,
      prepStartsAt,
      endsAt,
    );
    const offered = await this.waitlist.createOffer(
      entry,
      {
        ...attendant,
        cabinId,
        prepStartsAt,
        endsAt,
        price: service.price,
        depositAmount: depositAmountFor(service.price, service.depositPercent),
      },
      now,
    );
    // No real mail for now: the log is where to find the link to open the offer.
    if (offered)
      logger.log(
        `Anotación ${entry.id} offered Service ${service.id} at ${startsAt.toISOString()}: /slot-waitlist-links/${entry.link}`,
      );
  }
}
