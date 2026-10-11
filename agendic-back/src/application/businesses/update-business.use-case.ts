import { Inject, Injectable } from '@nestjs/common';
import { assertNotReservedSlug } from '../../domain/slugs/assert-not-reserved-slug';
import { Business, UpdateBusinessInput } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { assertOwner } from './assert-owner';

@Injectable()
export class UpdateBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * @throws {NotFoundError} el Negocio no existe
   * @throws {ForbiddenError} el Usuario no es el Dueño
   * @throws {ConflictError} el Enlace de reserva es una palabra reservada o ya está en uso por un Negocio o un Usuario
   */
  async execute(
    userId: number,
    businessId: number,
    input: UpdateBusinessInput,
  ): Promise<Business> {
    assertOwner(await this.businesses.findById(businessId), userId);
    assertNotReservedSlug(input.slug);
    return this.businesses.update(businessId, input);
  }
}
