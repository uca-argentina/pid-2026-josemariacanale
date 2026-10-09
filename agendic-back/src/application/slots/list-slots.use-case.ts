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
import { serviceTimeZone } from '../services/service-time-zone';

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

/**
 * Horarios reservables de quien atiende un Servicio, día por día: cada Empleado que lo Ofrece, o el propio Usuario
 * en un Servicio personal (`employeeId` nulo).
 */
export interface EmployeeSlots {
  employeeId: number | null;
  userId: number;
  days: DaySlots[];
}

/** La unión de los Horarios reservables de varias listas de días, todas de las mismas fechas. */
function unionDays(perEmployee: DaySlots[][]): DaySlots[] {
  return perEmployee[0].map((day, i) => {
    const slots = [
      ...new Set(perEmployee.flatMap((days) => days[i].slots)),
    ].sort();
    if (slots.length > 0) return { date: day.date, slots };
    const reasons = perEmployee.map((days) => days[i].reason);
    return {
      date: day.date,
      slots,
      reason: reasons.includes('FULLY_BOOKED') ? 'FULLY_BOOKED' : 'NOT_WORKING',
    };
  });
}

/** Lista los Horarios reservables de un Servicio: la unión de los de cada Empleado que lo Ofrece. `excludeBookingId` deja libre el horario de un Turno que se está Reagendando. */
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

  /**
   * @throws {BusinessRuleError} el rango no es de 1 a 31 días
   * @throws {NotFoundError} el Servicio está dado de baja
   */
  async execute(
    serviceId: number,
    from: string,
    to: string,
    excludeBookingId?: number,
  ): Promise<{ timeZone: string; days: DaySlots[] }> {
    const { timeZone, employees } = await this.executeByEmployee(
      serviceId,
      from,
      to,
      excludeBookingId,
    );
    // A live Servicio always has an Empleado (the last one can't leave), so the guard is only for a corrupt row.
    return {
      timeZone,
      days: employees.length === 0 ? [] : unionDays(employees.map((e) => e.days)),
    };
  }

  /**
   * Lo mismo que `execute`, sin juntar: los Horarios reservables de cada Empleado, para elegir a quién asignar el Turno.
   *
   * @throws {BusinessRuleError} el rango no es de 1 a 31 días
   * @throws {NotFoundError} el Servicio está dado de baja
   */
  async executeByEmployee(
    serviceId: number,
    from: string,
    to: string,
    excludeBookingId?: number,
  ): Promise<{ timeZone: string; employees: EmployeeSlots[] }> {
    assertValidRange(from, to);

    const service = await this.services.findById(serviceId);
    if (!service || service.deletedAt)
      throw new NotFoundError('Service not found or retired');

    const timeZone = await serviceTimeZone(
      this.branches,
      this.availabilities,
      service,
    );

    const fullDates = new Set<string>();
    if (service.dailyLimit !== null) {
      // Noon UTC falls on the intended calendar date in any zone, so localDayBounds picks the right local day.
      const starts = await this.bookings.listOccupiedStartsByService(
        serviceId,
        localDayBounds(new Date(`${from}T12:00:00.000Z`), timeZone).from,
        localDayBounds(new Date(`${to}T12:00:00.000Z`), timeZone).to,
        excludeBookingId,
      );
      const perDate = new Map<string, number>();
      for (const start of starts) {
        const date = localDate(start, timeZone);
        perDate.set(date, (perDate.get(date) ?? 0) + 1);
      }
      for (const [date, taken] of perDate)
        if (taken >= service.dailyLimit) fullDates.add(date);
    }

    const now = this.clock.now();
    // A Servicio personal has no Empleados: its Usuario attends it with its own Availability.
    const attendants =
      service.userId !== null
        ? [
            {
              employeeId: null,
              userId: service.userId,
              availabilityId: service.availabilityId!,
            },
          ]
        : service.employees.map(({ id, userId, availabilityId }) => ({
            employeeId: id,
            userId,
            availabilityId,
          }));
    const employees = await Promise.all(
      attendants.map(async ({ employeeId, userId, availabilityId }) => {
        const availability = await this.availabilities.findById(availabilityId);
        if (!availability) throw new NotFoundError(`Availability ${availabilityId} not found`);
        // A day of slack either side (wider than any UTC offset) keeps every local date in [from, to] covered.
        const bookedRanges = await this.bookings.listOccupiedByUser(
          userId,
          new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 86_400_000),
          new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 2 * 86_400_000),
          excludeBookingId,
        );
        return {
          employeeId,
          userId,
          days: computeSlots({
            from,
            to,
            timeZone,
            availability,
            bookedRanges,
            durationMinutes: service.durationMinutes,
            prepMinutes: service.prepMinutes,
            slotInterval: service.slotInterval,
            minimumNoticeMinutes: service.minimumNoticeMinutes,
            fullDates,
            now,
          }),
        };
      }),
    );
    return { timeZone, employees };
  }
}
