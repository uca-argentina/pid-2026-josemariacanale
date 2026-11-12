import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  isReservedSlug,
  SLUG_FORMAT,
  SLUG_LENGTH,
} from '../../domain/slugs/reserved-slugs';

/** Si el Dueño puede usar un slug como Enlace de reserva de su Negocio, y si no, por qué. Contrato con el front (ADR 0026). */
export type SlugAvailability =
  | { available: true }
  | { available: false; reason: 'invalid' | 'reserved' | 'taken' };

/**
 * Dice si un slug está libre para el Enlace de reserva del Negocio, para verificarlo on blur en Crear y Editar Negocio.
 * Es solo una consulta: el alta y la edición lo vuelven a chequear (palabra reservada y la clave de `BookingSlug`).
 */
@Injectable()
export class CheckSlugAvailabilityUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * El slug se compara en minúsculas. Un slug de un Negocio o Usuario dado de baja sigue tomado (ADR 0024). El del
   * propio Negocio del Usuario cuenta como libre, para que Editar Negocio no marque el suyo.
   */
  async execute(userId: number, slug: string): Promise<SlugAvailability> {
    const lowered = slug.toLowerCase();
    if (
      lowered.length < SLUG_LENGTH.min ||
      lowered.length > SLUG_LENGTH.max ||
      !SLUG_FORMAT.test(lowered)
    )
      return { available: false, reason: 'invalid' };
    if (isReservedSlug(lowered))
      return { available: false, reason: 'reserved' };
    const owner = await this.businesses.findBookingSlugOwner(lowered);
    if (!owner) return { available: true };
    if (owner.businessId !== null) {
      const mine = await this.businesses.listByOwner(userId);
      if (mine.some((business) => business.id === owner.businessId))
        return { available: true };
    }
    return { available: false, reason: 'taken' };
  }
}
