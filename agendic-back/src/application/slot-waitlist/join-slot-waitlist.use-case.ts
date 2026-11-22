import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BusinessRuleError,
  ConflictError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
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
import { CLOCK, Clock } from '../../domain/clock';
import { serviceTimeZone } from '../services/service-time-zone';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { addDays, localDate } from 'src/domain/slots/slot';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { SlotWaitlistEntry } from '../../domain/slot-waitlist/slot-waitlist-entry';

export interface JoinSlotWaitlistInput {
  serviceId: number;
  startsAt: string;
  employeeId?: number;
  clientName: string;
  clientEmail: string;
  code: string;
}

@Injectable()
export class JoinSlotWaitlistUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    private readonly listSlots: ListSlotsUseCase,
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

    const timezone = await serviceTimeZone(
      this.branches,
      this.availabilities,
      service,
    );
    const date = localDate(startsAt, timezone);
    const timeSlots = await this.listSlots.execute(
      service.id,
      date,
      date,
      undefined,
      input.employeeId,
    );
    if (timeSlots.days[0]?.slots.includes(startsAt.toISOString())) {
      throw new ConflictError(
        `Slot ${input.startsAt} is free for Service ${service.id}`,
      );
    }

    const employeeId = input.employeeId ?? null;
    const result = {
      serviceId: service.id,
      date: startsAt.toISOString(),
    };
    const alive = await this.waitlist.findAlive(
      service.id,
      employeeId,
      startsAt,
      input.clientEmail,
    );
    if (alive) return { ...result, created: false };

    let entry: SlotWaitlistEntry;
    const dbEntry = {
      clientName: input.clientName,
      email: input.clientEmail,
      employeeId: employeeId,
      serviceId: service.id,
      startsAt: startsAt,
    };
    try {
      entry = await this.waitlist.create(dbEntry);
    } catch (error) {
      // Lost a race against the same Anotación: it exists now, which is the idempotent answer.
      if (error instanceof ConflictError) return { ...result, created: false };
      throw error;
    }
    return { ...result, created: true };
  }
}
