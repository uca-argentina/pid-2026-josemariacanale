import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';

/** Un Negocio al que el Usuario puede mirarle las analíticas. */
export type AnalyticsBusiness = {
  id: number;
  name: string;
  isOwner: boolean;
};

/** Los Negocios cuyas analíticas puede ver el Usuario de la Sesión. */
@Injectable()
export class ListAnalyticsBusinessesUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * Los Negocios no dados de baja donde el Usuario es Empleado vigente, el suyo primero y los demás por nombre.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async execute(userId: number): Promise<AnalyticsBusiness[]> {
    const employees = await this.employees.listActiveByUser(userId);
    const found = await Promise.all(
      employees.map((e) => this.businesses.findById(e.businessId)),
    );
    return found
      .filter((b): b is Business => b !== null && b.deletedAt === null)
      .map((b) => ({ id: b.id, name: b.name, isOwner: b.ownerId === userId }))
      .sort(
        (a, b) =>
          Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name),
      );
  }
}
