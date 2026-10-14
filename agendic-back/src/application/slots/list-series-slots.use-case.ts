import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  BadRequestError,
  BusinessRuleError,
  NotFoundError,
} from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { seriesDates } from '../../domain/slots/series';
import { EmployeeSlots, ListSlotsUseCase } from './list-slots.use-case';

/** Una fecha de la Serie, y si el Empleado de la Serie puede atender ahí (`available`). */
export interface SeriesSlot {
  date: string;
  startsAt: string;
  available: boolean;
}

/**
 * Las fechas de una Serie de un Servicio con Repetición y quién la atiende, validando cada una con los mismos
 * Horarios reservables que un Turno suelto. Una fecha sin horario es un choque (`available: false`), no un error.
 */
@Injectable()
export class ListSeriesSlotsUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Con `employeeId` (Empleado elegido) todas las fechas son de ese Empleado. Sin él, el Servicio del Negocio elige al
   * que Ofrece el Servicio y está libre en el primer horario y en más fechas; si empatan, al que hace más tiempo que
   * no recibe un Turno del Servicio, y después al de menor id. En un Servicio personal, `employeeId` es nulo.
   *
   * @throws {NotFoundError} el Servicio no existe o está dado de baja, o `employeeId` no lo Ofrece
   * @throws {BusinessRuleError} el Servicio no tiene Repetición, o el primer horario no es reservable
   * @throws {BadRequestError} `count` fuera de 2 al máximo de la Repetición, o `employeeId` en un Servicio personal
   */
  async execute(
    serviceId: number,
    startsAt: Date,
    count: number,
    employeeId?: number,
  ): Promise<{ employeeId: number | null; dates: SeriesSlot[] }> {
    const service = await this.services.findById(serviceId);
    if (!service || service.deletedAt)
      throw new NotFoundError('Service not found or retired');
    if (service.repeatEveryWeeks === null || service.repeatMaxBookings === null)
      throw new BusinessRuleError(`Service ${serviceId} has no Repetición`);
    if (!Number.isInteger(count) || count < 2 || count > service.repeatMaxBookings)
      throw new BadRequestError(
        `count must be between 2 and ${service.repeatMaxBookings}`,
      );

    // The first call also validates `employeeId` and resolves the zone the dates are read in.
    const probe = await this.listSlots.executeByEmployee(
      serviceId,
      startsAt.toISOString().slice(0, 10),
      startsAt.toISOString().slice(0, 10),
      undefined,
      employeeId,
    );
    const dates = seriesDates(
      startsAt,
      service.repeatEveryWeeks,
      count,
      probe.timeZone,
    );
    const perDate = await Promise.all(
      dates.map(({ date }) =>
        this.listSlots.executeByEmployee(serviceId, date, date, undefined, employeeId),
      ),
    );
    const isFree = (employee: EmployeeSlots, at: Date) =>
      employee.days.some((day) => day.slots.includes(at.toISOString()));
    const freeDates = (employee: EmployeeSlots, i: number) =>
      isFree(perDate[i].employees.find((e) => e.userId === employee.userId)!, dates[i].startsAt);

    const candidates = perDate[0].employees.filter((e) => freeDates(e, 0));
    if (candidates.length === 0)
      throw new BusinessRuleError(
        `Slot ${dates[0].startsAt.toISOString()} is not available for Service ${serviceId}`,
      );

    const chosen = await this.pick(serviceId, candidates, (e) =>
      dates.reduce((n, _, i) => n + Number(freeDates(e, i)), 0),
    );
    return {
      employeeId: chosen.employeeId,
      dates: dates.map(({ date, startsAt: at }, i) => ({
        date,
        startsAt: at.toISOString(),
        available: freeDates(chosen, i),
      })),
    };
  }

  private async pick(
    serviceId: number,
    candidates: EmployeeSlots[],
    freeCount: (employee: EmployeeSlots) => number,
  ): Promise<EmployeeSlots> {
    if (candidates.length === 1 || candidates[0].employeeId === null)
      return candidates[0];
    const best = Math.max(...candidates.map(freeCount));
    const tied = candidates.filter((e) => freeCount(e) === best);
    if (tied.length === 1) return tied[0];
    const lastReceived = await this.bookings.lastReceivedByEmployee(
      serviceId,
      tied.map(({ employeeId }) => employeeId!),
    );
    // Never received sorts first (0); equal times fall back to the lower id.
    return [...tied].sort(
      (a, b) =>
        (lastReceived.get(a.employeeId!)?.getTime() ?? 0) -
          (lastReceived.get(b.employeeId!)?.getTime() ?? 0) ||
        a.employeeId! - b.employeeId!,
    )[0];
  }
}
