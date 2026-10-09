import { Inject, Injectable } from '@nestjs/common';
import { Branch } from '../../domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';

/** Un Negocio del que el Usuario es Empleado activo, con sus Sucursales y los Servicios que el Usuario puede ver. */
export interface ServiceCatalogGroup {
  business: Business;
  role: 'owner' | 'employee';
  /** El Empleado del Usuario en ese Negocio. */
  employeeId: number;
  branches: (Branch & { services: Service[] })[];
}

/** Arma el catálogo de Servicios que el panel le muestra al Usuario: un grupo por Negocio donde es Empleado activo. */
@Injectable()
export class ListMyServicesUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  /**
   * Las Sucursales van ordenadas por slug y aparecen aunque no tengan Servicios. Un Servicio oculto sale solo
   * si el Usuario es Dueño del Negocio o lo atiende. Vacío si el Usuario no es Empleado activo de nada.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async execute(userId: number): Promise<ServiceCatalogGroup[]> {
    const employees = await this.employees.listActiveByUser(userId);
    const groups = await Promise.all(
      employees.map(async (employee) => {
        const business = await this.businesses.findById(employee.businessId);
        // Un Negocio dado de baja deja de verse, aunque quede un Empleado suyo activo.
        if (!business) return null;
        const isOwner = business.ownerId === userId;
        const branches = (await this.branches.listByBusiness(business.id)).sort(
          (a, b) => a.slug.localeCompare(b.slug),
        );
        return {
          business,
          role: isOwner ? ('owner' as const) : ('employee' as const),
          employeeId: employee.id,
          branches: await Promise.all(
            branches.map(async (branch) => ({
              ...branch,
              services: (
                await this.services.listActiveByBranch(branch.id)
              ).filter(
                (service) =>
                  !service.hidden ||
                  isOwner ||
                  service.employees.some(({ id }) => id === employee.id),
              ),
            })),
          ),
        };
      }),
    );
    return groups.filter((group) => group !== null);
  }
}
