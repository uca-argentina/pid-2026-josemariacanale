import { Inject, Injectable } from '@nestjs/common';
import { highestLevels, HighestLevel } from '../../domain/badges/badges';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { ForbiddenError } from '../../domain/errors';
import { assertBusinessExists } from '../businesses/assert-owner';
import { EvaluateBadgesUseCase } from '../badges/evaluate-badges.use-case';

/** Un Empleado del Staff con las Insignias que ganó, sin progreso. */
export type StaffMember = { employee: Employee; badges: HighestLevel[] };

/** Lista el Staff de un Negocio, abierto a cualquier Empleado activo suyo (el Dueño incluido). */
@Injectable()
export class ListEmployeesByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    private readonly evaluateBadges: EvaluateBadgesUseCase,
  ) {}

  /**
   * Responde el Staff con el Nivel más alto de cada Insignia de cada Empleado. Evalúa a todo el Staff en un solo
   * lote antes de responder, así un Nivel que alcanzó un Empleado queda guardado (sin ver) aunque él no haya
   * abierto la app. El progreso en curso no sale de acá.
   *
   * @throws {NotFoundError} el Negocio no existe o está dado de baja
   * @throws {ForbiddenError} el Usuario no es Empleado activo del Negocio
   * @throws {DatabaseOperationError} una consulta o la escritura de Insignias falló
   */
  async execute(userId: number, businessId: number): Promise<StaffMember[]> {
    assertBusinessExists(await this.businesses.findById(businessId));
    const staff = await this.employees.listActiveByBusiness(businessId);
    if (!staff.some((employee) => employee.userId === userId))
      throw new ForbiddenError(
        `Only Employees of Business ${businessId} can see its Staff`,
      );
    const evaluations = await this.evaluateBadges.execute(
      staff.map((employee) => employee.userId),
    );
    return staff.map((employee) => ({
      employee,
      badges: highestLevels(evaluations.get(employee.userId)?.earned ?? []),
    }));
  }
}
