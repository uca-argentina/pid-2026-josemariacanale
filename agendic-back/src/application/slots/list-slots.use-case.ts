import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
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
import {
  computeSlots,
  DaySlots,
  localDate,
  localDayBounds,
} from '../../domain/slots/slot';

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

/** Lista los Horarios reservables de un Empleado para un Servicio; `excludeBookingId` deja libre el horario de un Turno que se está Reagendando. */
@Injectable()
export class ListSlotsUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    serviceId: number,
    employeeId: number,
    from: string,
    to: string,
    excludeBookingId?: number,
  ): Promise<{ timeZone: string; days: DaySlots[] }> {
    assertValidRange(from, to);

    const service = await this.services.findById(serviceId);
    if (!service || service.retiredAt)
      throw new NotFoundError('Service not found or retired');
    const link = await this.services.findEmployeeLink(serviceId, employeeId);
    if (!link)
      throw new NotFoundError('Employee is not in charge of this Service');

    const [branch, availability] = await Promise.all([
      this.branches.findById(service.branchId),
      this.availabilities.findById(link.availabilityId),
    ]);
    if (!branch) throw new NotFoundError('Branch not found');
    if (!availability) throw new NotFoundError('Availability not found');

    // A day of slack either side (wider than any UTC offset) keeps every local date in [from, to] covered.
    const bookedRanges = await this.bookings.listOccupiedByEmployee(
      employeeId,
      new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 86_400_000),
      new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 2 * 86_400_000),
      excludeBookingId,
    );

    const fullDates = new Set<string>();
    if (service.dailyLimit !== null) {
      const starts = await this.bookings.listOccupiedStartsByService(
        serviceId,
        localDayBounds(new Date(`${from}T12:00:00.000Z`), branch.timeZone).from,
        localDayBounds(new Date(`${to}T12:00:00.000Z`), branch.timeZone).to,
        excludeBookingId,
      );
      const perDate = new Map<string, number>();
      for (const start of starts) {
        const date = localDate(start, branch.timeZone);
        perDate.set(date, (perDate.get(date) ?? 0) + 1);
      }
      for (const [date, taken] of perDate)
        if (taken >= service.dailyLimit) fullDates.add(date);
    }

    return {
      timeZone: branch.timeZone,
      days: computeSlots({
        from,
        to,
        timeZone: branch.timeZone,
        availability,
        bookedRanges,
        durationMinutes: service.durationMinutes,
        prepMinutes: service.prepMinutes,
        slotInterval: service.slotInterval,
        minimumNoticeMinutes: service.minimumNoticeMinutes,
        fullDates,
        now: this.clock.now(),
      }),
    };
  }
}
