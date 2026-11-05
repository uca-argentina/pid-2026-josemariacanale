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
import {
  BranchChangeBooking,
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { planBranchChange } from './plan-branch-change';

/** Vista previa de los Turnos que se cancelan al cambiar las Sucursales de un Empleado (ADR 0034). */
@Injectable()
export class PreviewEmployeeBranchesUseCase {
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
   * Los Turnos pendientes o aceptados del Empleado, que todavía no empezaron, en las Sucursales que pierde, por
   * `startsAt`, sin guardar nada. Falla igual que el cambio y en el mismo orden, antes de calcular.
   *
   * @throws ver `planBranchChange`
   */
  async execute(
    userId: number,
    employeeId: number,
    branchIds: number[],
  ): Promise<BranchChangeBooking[]> {
    const { employee, lostBranchIds } = await planBranchChange(
      this.deps,
      userId,
      employeeId,
      branchIds,
    );
    if (lostBranchIds.length === 0) return [];
    return this.employees.listUpcomingInBranches(
      employee.id,
      lostBranchIds,
      this.clock.now(),
    );
  }
}
