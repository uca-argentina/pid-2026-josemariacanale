import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';

/** Un Negocio del que el Usuario es Empleado activo. */
export interface MyBusiness {
  business: Business;
  role: 'owner' | 'employee';
  /** Las Sucursales donde trabaja el Usuario; el Dueño trabaja en todas. */
  branchIds: number[];
}

/** Lista los Negocios donde el Usuario es Empleado activo, para la pantalla "Negocios". */
@Injectable()
export class ListMyBusinessesUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * El Negocio del que es Dueño va primero y los demás por nombre. Vacío si no es Empleado de ninguno.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async execute(userId: number): Promise<MyBusiness[]> {
    const mine = (await this.businesses.listByEmployeeUser(userId)).map(
      ({ business, branchIds }): MyBusiness => ({
        business,
        role: business.ownerId === userId ? 'owner' : 'employee',
        branchIds,
      }),
    );
    return mine.sort(
      (a, b) =>
        Number(b.role === 'owner') - Number(a.role === 'owner') ||
        a.business.name.localeCompare(b.business.name),
    );
  }
}
