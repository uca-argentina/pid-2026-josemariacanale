import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { Employee } from '../../domain/employees/employee';
import {
  BranchChangeBooking,
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { ConflictError } from '../../domain/errors';
import { MAILER, Mailer, SeriesNotice } from '../../domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { notifyClients, notifySeries } from '../bookings/notify-clients';
import { planBranchChange } from './plan-branch-change';

/** El Dueño cambia las Sucursales donde trabaja un Empleado; sacarle una equivale a que deje de Ofrecer sus Servicios. */
@Injectable()
export class ChangeEmployeeBranchesUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  private get deps() {
    return {
      employees: this.employees,
      businesses: this.businesses,
      branches: this.branches,
      services: this.services,
    };
  }

  /**
   * Cambia las Sucursales del Empleado, lo saca de los Servicios de las que pierde y cancela, en una transacción, sus
   * Turnos futuros ahí (ADR 0034); después avisa a cada Cliente, uno por Serie. Los ids de `cancelBookingIds` que ya no
   * se cancelan se ignoran.
   *
   * @param cancelBookingIds los Turnos que el Dueño vio en la vista previa y confirmó
   * @throws {ConflictError} se cancelaría algún Turno que `cancelBookingIds` no incluye
   * @throws ver `planBranchChange` para el resto
   */
  async execute(
    userId: number,
    employeeId: number,
    branchIds: number[],
    cancelBookingIds: number[] = [],
  ): Promise<{ employee: Employee; cancelledBookings: number }> {
    const now = this.clock.now();
    const {
      employee,
      branchIds: chosen,
      lostBranchIds,
    } = await planBranchChange(this.deps, userId, employeeId, branchIds);
    const leaving =
      lostBranchIds.length === 0
        ? []
        : await this.employees.listUpcomingInBranches(
            employee.id,
            lostBranchIds,
            now,
          );
    const confirmed = new Set(cancelBookingIds);
    if (leaving.some(({ id }) => !confirmed.has(id)))
      throw new ConflictError('Los Turnos que se cancelan cambiaron');

    const { employee: changed, cancelledIds } =
      await this.employees.changeBranches(
        employee.id,
        chosen,
        leaving.map(({ id }) => id),
        now,
      );
    const cancelled = new Set(cancelledIds);
    await this.notify(leaving.filter(({ id }) => cancelled.has(id)));
    return { employee: changed, cancelledBookings: cancelledIds.length };
  }

  /** Un Aviso de cambio del Turno por Turno suelto y uno por Serie con todas sus fechas. */
  private async notify(cancelled: BranchChangeBooking[]): Promise<void> {
    const send = (
      email: string,
      link: string,
      reason: string | null,
      series?: SeriesNotice,
    ) => this.mailer.sendBookingCancellation(email, link, reason, series);
    const series = new Map<string, BranchChangeBooking[]>();
    const single: BranchChangeBooking[] = [];
    for (const booking of cancelled) {
      if (booking.seriesId === null) single.push(booking);
      else
        series.set(booking.seriesId, [
          ...(series.get(booking.seriesId) ?? []),
          booking,
        ]);
    }
    await notifyClients(single, (email, link, reason) =>
      send(email, link, reason),
    );
    for (const group of series.values())
      await notifySeries(group, async () => group[0].timeZone, send);
  }
}
