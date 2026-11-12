import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ResolveSlugUseCase } from '../../application/slugs/resolve-slug.use-case';
import { presentBusiness } from '../businesses/business.presenter';
import { presentService } from '../services/service.presenter';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { CheckSlugAvailabilityUseCase } from '../../application/slugs/check-slug-availability.use-case';

/** El primer tramo del Enlace de reserva (ADR 0026): de quién es (público) y si el Dueño lo puede usar (con Sesión). */
@Controller('slugs')
export class SlugsController {
  constructor(
    private readonly resolveSlugUseCase: ResolveSlugUseCase,
    private readonly checkSlugAvailabilityUseCase: CheckSlugAvailabilityUseCase,
  ) {}

  /** Público: de quién es el primer tramo de un Enlace de reserva, con la misma forma que `GET /businesses/by-slug/:slug` o `GET /u/:userSlug`. 404 si no es de nadie. */
  @Get(':slug')
  async resolve(@Param('slug') slug: string) {
    const resolved = await this.resolveSlugUseCase.execute(slug);
    if (resolved.kind === 'business')
      return { kind: 'business', business: presentBusiness(resolved.business) };
    return {
      kind: 'user',
      user: {
        name: resolved.user.name,
        slug: resolved.user.slug,
        imageUrl: resolved.user.imageUrl,
        services: resolved.services.map(presentService),
      },
    };
  }

  /** Con Sesión: si el Dueño puede usar el slug como Enlace de reserva. Para verificarlo on blur en Crear/Editar Negocio. */
  @Get(':slug/availability')
  @UseGuards(ClerkGuard)
  async availability(
    @CurrentUser() userId: number,
    @Param('slug') slug: string,
  ) {
    return this.checkSlugAvailabilityUseCase.execute(userId, slug);
  }
}
