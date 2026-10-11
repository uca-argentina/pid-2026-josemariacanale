import { Controller, Get, Param } from '@nestjs/common';
import { ResolveSlugUseCase } from '../../application/slugs/resolve-slug.use-case';
import { presentBusiness } from '../businesses/business.presenter';
import { presentService } from '../services/service.presenter';

/** Resolutor público del primer tramo del Enlace de reserva (ADR 0026). */
@Controller('slugs')
export class SlugsController {
  constructor(private readonly resolveSlugUseCase: ResolveSlugUseCase) {}

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
}
