import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { FILE_STORAGE, FileStorage } from '../../domain/file-storage';
import { assertOwner } from './assert-owner';

/** Saca el Logo del Negocio. */
@Injectable()
export class RemoveBusinessLogoUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(FILE_STORAGE)
    private readonly storage: FileStorage,
  ) {}

  /**
   * Sin Logo no hace nada. Limpia la fila antes de borrar el archivo, y que el archivo no se pueda borrar
   * no hace fallar una baja que ya ocurrió.
   *
   * @throws {NotFoundError} el Negocio no existe o está dado de baja
   * @throws {ForbiddenError} el Usuario no es el Dueño
   */
  async execute(userId: number, businessId: number): Promise<void> {
    const business = await this.businesses.findById(businessId);
    assertOwner(business, userId);
    if (!business.logoUrl) return;
    await this.businesses.update(businessId, { logoUrl: null });
    await this.storage.delete(business.logoUrl).catch(() => undefined);
  }
}
