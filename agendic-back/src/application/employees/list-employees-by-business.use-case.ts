import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { DatabaseOperationError, ForbiddenError } from '../../domain/errors';
import { assertBusinessExists } from '../businesses/assert-owner';
import {
  BadgeEvaluation,
  EvaluateBadgesUseCase,
} from '../badges/evaluate-badges.use-case';

const logger = new Logger('ListEmployeesByBusiness');

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
   * abierto la app. El progreso en curso no sale de acá. Si la evaluación falla, el Staff igual se responde, con
   * `badges` vacío en cada fila: las Insignias son un adorno de la lista y no deben bloquearla.
   *
   * @throws {NotFoundError} el Negocio no existe o está dado de baja
   * @throws {ForbiddenError} el Usuario no es Empleado activo del Negocio
   */
  async execute(userId: number, businessId: number): Promise<StaffMember[]> {
    assertBusinessExists(await this.businesses.findById(businessId));
    const staff = await this.employees.listActiveByBusiness(businessId);
    if (!staff.some((employee) => employee.userId === userId))
      throw new ForbiddenError(
        `Only Employees of Business ${businessId} can see its Staff`,
      );
    let evaluations = new Map<number, BadgeEvaluation>();
    try {
      evaluations = await this.evaluateBadges.execute(
        staff.map((employee) => employee.userId),
      );
    } catch (error) {
      // Solo se tolera la falla de la base; cualquier otro error es un bug y tiene que verse.
      if (!(error instanceof DatabaseOperationError)) throw error;
      logger.error(
        `Badges of the Staff of Business ${businessId} not evaluated`,
        error.stack,
      );
    }
    return staff.map((employee) => ({
      employee,
      badges: highestLevels(evaluations.get(employee.userId)?.earned ?? []),
    }));
  }
}
