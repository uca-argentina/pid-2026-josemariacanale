import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BusinessRuleError,
  ConflictError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { localDate } from '../../domain/slots/slot';
import {
  SLOT_WAITLIST_REPOSITORY,
  SlotWaitlistRepository,
} from '../../domain/slot-waitlist/slot-waitlist.repository';
import { serviceTimeZone } from '../services/service-time-zone';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';

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
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    private readonly listSlots: ListSlotsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
  ) {}

  async execute(input: JoinSlotWaitlistInput): Promise<{
    serviceId: number;
    startsAt: string;
    link: string;
    created: boolean;
  }> {
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

    const timeZone = await serviceTimeZone(
      this.branches,
      this.availabilities,
      service,
    );
    const date = localDate(startsAt, timeZone);
    const { days } = await this.listSlots.execute(
      service.id,
      date,
      date,
      undefined,
      input.employeeId,
    );
    if (days[0]?.slots.includes(startsAt.toISOString()))
      throw new ConflictError(
        `Slot ${input.startsAt} is free for Service ${service.id}`,
      );
    // Not free could also mean no horario at all at that time: there must be a Turno there to wait for.
    const taken = await this.bookings.listOccupiedStartsByService(
      service.id,
      startsAt,
      new Date(startsAt.getTime() + 1),
    );
    if (!taken.some((start) => start.getTime() === startsAt.getTime()))
      throw new BusinessRuleError(
        `No Turno at ${input.startsAt} in Service ${service.id} to wait for`,
      );

    const employeeId = input.employeeId ?? null;
    const result = { serviceId: service.id, startsAt: startsAt.toISOString() };
    // No mail yet (only the log does), so the link to follow the Anotación goes back in the response.
    const alive = await this.waitlist.findAlive(
      service.id,
      employeeId,
      startsAt,
      input.clientEmail,
    );
    if (alive) return { ...result, link: alive.link, created: false };

    const entry = await this.waitlist.create({
      clientName: input.clientName,
      email: input.clientEmail,
      employeeId,
      serviceId: service.id,
      startsAt,
    });
    return { ...result, link: entry.link, created: true };
  }
}
