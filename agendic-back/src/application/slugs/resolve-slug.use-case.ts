import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { User } from '../../domain/users/user';
import { GetUserPageUseCase } from '../users/get-user-page.use-case';

/** De quién es un primer tramo: el Negocio, o el Usuario con sus Servicios personales no ocultos. */
export type ResolvedSlug =
  | { kind: 'business'; business: Business }
  | { kind: 'user'; user: User; services: Service[] };

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Dice de quién es el primer tramo de un Enlace de reserva: de un Negocio o de un Usuario (ADR 0026). */
@Injectable()
export class ResolveSlugUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    private readonly getUserPage: GetUserPageUseCase,
  ) {}

  /**
   * El tramo se compara en minúsculas. Los dos espacios no se pisan: Postgres no deja repetir un slug entre Negocio y Usuario.
   *
   * @throws {NotFoundError} nadie tiene ese tramo, es de un Negocio o Usuario dado de baja, o no tiene formato de slug
   */
  async execute(slug: string): Promise<ResolvedSlug> {
    const lowered = slug.toLowerCase();
    if (!SLUG_FORMAT.test(lowered)) throw this.notFound(slug);
    const business = await this.businesses.findBySlug(lowered);
    if (business) return { kind: 'business', business };
    try {
      return { kind: 'user', ...(await this.getUserPage.execute(lowered)) };
    } catch (error) {
      if (error instanceof NotFoundError) throw this.notFound(slug);
      throw error;
    }
  }

  private notFound(slug: string) {
    return new NotFoundError(`Booking link ${slug} not found`);
  }
}
