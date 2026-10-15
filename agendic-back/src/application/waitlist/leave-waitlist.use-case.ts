import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  WAITLIST_REPOSITORY,
  WaitlistRepository,
} from '../../domain/waitlist/waitlist.repository';
import { findByLink } from './get-waitlist-entry-by-link.use-case';

/** Saca al Cliente de la Lista de espera desde el enlace de su Anotación, sin Verificar email de nuevo (ADR 0034). */
@Injectable()
export class LeaveWaitlistUseCase {
  constructor(
    @Inject(WAITLIST_REPOSITORY) private readonly waitlist: WaitlistRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Idempotente: si ya había Salido no vuelve a guardar nada.
   *
   * @throws {NotFoundError} el enlace no corresponde a ninguna Anotación
   */
  async execute(link: string): Promise<void> {
    const entry = await findByLink(this.waitlist, link);
    if (!entry.left) await this.waitlist.leave(entry.id, this.clock.now());
  }
}
