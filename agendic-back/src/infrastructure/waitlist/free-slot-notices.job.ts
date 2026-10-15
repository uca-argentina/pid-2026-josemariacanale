import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SendFreeSlotNoticesUseCase } from '../../application/waitlist/send-free-slot-notices.use-case';

/** Cada 5 minutos avisa a la Lista de espera de los días que volvieron a tener Horarios reservables (ADR 0034). */
@Injectable()
export class FreeSlotNoticesJob {
  constructor(private readonly sendFreeSlotNotices: SendFreeSlotNoticesUseCase) {}

  /**
   * Corre una pasada del caso de uso.
   *
   * @throws {DatabaseOperationError} falló la base al buscar las Anotaciones
   */
  @Cron('*/5 * * * *')
  run() {
    return this.sendFreeSlotNotices.execute();
  }
}
