import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListMyBusinessesUseCase } from '../../application/businesses/list-my-businesses.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';

/** Negocios del Usuario de la Sesión. */
@Controller()
export class UserBusinessesController {
  constructor(
    private readonly listMyBusinessesUseCase: ListMyBusinessesUseCase,
  ) {}

  /** Los Negocios donde el Usuario es Empleado activo, con su rol y las Sucursales donde trabaja. */
  @Get('users/me/businesses')
  @UseGuards(ClerkGuard)
  async list(@CurrentUser() userId: number) {
    return (await this.listMyBusinessesUseCase.execute(userId)).map(
      ({ business, role, branchIds }) => ({
        id: business.id,
        name: business.name,
        description: business.description,
        slug: business.slug,
        logoUrl: business.logoUrl,
        role,
        branchIds,
      }),
    );
  }
}
