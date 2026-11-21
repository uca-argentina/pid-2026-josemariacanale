import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BusinessRuleError,
  ConflictError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import { localDate } from '../../domain/slots/slot';
import { WaitlistEntry } from '../../domain/waitlist/waitlist-entry';
import { serviceTimeZone } from '../services/service-time-zone';
import { SLOT_WAITLIST_REPOSITORY } from '../../domain/slot-waitlist/slot-waitlist.repository';
import { SlotWaitlistRepository } from '../../domain/slot-waitlist/slot-waitlist.repository';
import {
  BookingVerificationCodes,
  BOOKING_VERIFICATION_CODES,
} from '../../domain/bookings/booking-verification-codes';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  WAITLIST_REPOSITORY,
  WaitlistRepository,
} from '../../domain/waitlist/waitlist.repository';

export interface JoinSlotWaitlistInput {
  clientName: string;
  clientEmail: string;
  serviceId: number;
  code: string;
  startsAt: string;
}
const logger = new Logger('JoinSlotWaitlist');

@Injectable()
export class JoinSlotWaitlistUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
  ) {}
  async execute(
    input: JoinSlotWaitlistInput,
  ): Promise<{ serviceId: number; date: string; created: boolean }> {
    if (!this.codes.verify(input.clientEmail, input.code))
      throw new InvalidCodeError(
        `Invalid or expired verification code for ${input.clientEmail}`,
      );

    const service = await this.services.findById(input.serviceId);
    if (!service || service.deletedAt)
      throw new NotFoundError('Service not found or retired');

    const startsAt = new Date(input.startsAt);
    if (startsAt < this.clock.now())
      throw new BusinessRuleError(`Slot ${input.startsAt} is in the past`);

    return { serviceId: 0, date: 'cuming date', created: true };
  }
}
