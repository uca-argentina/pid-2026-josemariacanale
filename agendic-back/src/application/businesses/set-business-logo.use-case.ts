import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  FILE_STORAGE,
  FileStorage,
  FileUpload,
} from '../../domain/file-storage';
import { assertOwner } from './assert-owner';

/** Pone o reemplaza el Logo del Negocio. */
@Injectable()
export class SetBusinessLogoUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(FILE_STORAGE)
    private readonly storage: FileStorage,
  ) {}

  /**
   * Guarda el Logo nuevo antes de borrar el anterior: fallar en el medio deja un archivo sin uso, nunca un
   * Negocio sin Logo. Que no se pueda borrar un archivo es solo espacio perdido y no hace fallar la operación.
   *
   * @throws {NotFoundError} el Negocio no existe o está dado de baja
   * @throws {ForbiddenError} el Usuario no es el Dueño
   */
  async execute(
    userId: number,
    businessId: number,
    file: FileUpload,
  ): Promise<Business> {
    const current = await this.businesses.findById(businessId);
    assertOwner(current, userId);
    const url = await this.storage.upload(file);
    let updated: Business;
    try {
      updated = await this.businesses.update(businessId, { logoUrl: url });
    } catch (error) {
      await this.storage.delete(url).catch(() => undefined);
      throw error;
    }
    if (current.logoUrl)
      await this.storage.delete(current.logoUrl).catch(() => undefined);
    return updated;
  }
}
