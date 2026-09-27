import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  AVAILABILITY_OVERRIDES_REPOSITORY,
  AvailabilityOverridesRepository,
} from '../../domain/availability-overrides/availability-overrides.repository';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { computeSlots, DaySlots } from '../../domain/slots/slot';

const MAX_RANGE_DAYS = 31;

function assertValidRange(from: string, to: string): void {
  const days =
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000 +
    1;
  if (days < 1 || days > MAX_RANGE_DAYS)
    throw new BusinessRuleError(
      `El rango tiene que ser de 1 a ${MAX_RANGE_DAYS} días, con to no anterior a from`,
    );
}

@Injectable()
export class ListSlotsUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(AVAILABILITY_OVERRIDES_REPOSITORY)
    private readonly overrides: AvailabilityOverridesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    serviceId: number,
    employeeId: number,
    from: string,
    to: string,
  ): Promise<{ timeZone: string; days: DaySlots[] }> {
    assertValidRange(from, to);

    const service = await this.services.findById(serviceId);
    if (!service || service.retiredAt)
      throw new NotFoundError('Service not found or retired');
    const link = await this.services.findEmployeeLink(serviceId, employeeId);
    if (!link)
      throw new NotFoundError('Employee is not in charge of this Service');

    const [branch, availability, allOverrides] = await Promise.all([
      this.branches.findById(service.branchId),
      this.availabilities.findById(link.availabilityId),
      this.overrides.listByEmployee(employeeId),
    ]);
    if (!branch) throw new NotFoundError('Branch not found');
    if (!availability) throw new NotFoundError('Availability not found');

    // A day of slack either side (wider than any UTC offset) keeps every local date in [from, to] covered.
    const bookedRanges = await this.bookings.listBookedByEmployee(
      employeeId,
      new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 86_400_000),
      new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 2 * 86_400_000),
    );

    return {
      timeZone: branch.timeZone,
      days: computeSlots({
        from,
        to,
        branch,
        availabilityIntervals: availability.intervals,
        overridesByDate: new Map(
          allOverrides
            .filter((o) => o.date >= from && o.date <= to)
            .map((o) => [o.date, o]),
        ),
        bookedRanges,
        durationMinutes: service.durationMinutes,
        now: this.clock.now(),
      }),
    };
  }
}
