import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors';
import { WaitlistEntryView } from '../../domain/waitlist/waitlist-entry';
import {
  WAITLIST_REPOSITORY,
  WaitlistRepository,
} from '../../domain/waitlist/waitlist.repository';

/** Abre la Anotación de su enlace, haya Salido o no, y aunque la fecha haya pasado o el Servicio esté dado de baja (ADR 0034). */
@Injectable()
export class GetWaitlistEntryByLinkUseCase {
  constructor(
    @Inject(WAITLIST_REPOSITORY) private readonly waitlist: WaitlistRepository,
  ) {}

  /** @throws {NotFoundError} el enlace no corresponde a ninguna Anotación */
  async execute(
    link: string,
  ): Promise<Omit<WaitlistEntryView, 'id' | 'serviceId'>> {
    const { id, serviceId, ...view } = await findByLink(this.waitlist, link);
    return view;
  }
}

/** @throws {NotFoundError} el enlace no corresponde a ninguna Anotación */
export const findByLink = async (
  waitlist: WaitlistRepository,
  link: string,
): Promise<WaitlistEntryView> => {
  const entry = await waitlist.findByLinkIncludeService(link);
  if (!entry) throw new NotFoundError('Anotación not found');
  return entry;
};
