import { Injectable } from '@nestjs/common';
import {
  CheckableCalendar,
  ConnectedCalendarsService,
} from './connected-calendars.service';

/** Los calendarios de la cuenta del Calendario conectado y cuáles cuentan como Ocupado externo. */
@Injectable()
export class ListCalendarsUseCase {
  constructor(private readonly calendars: ConnectedCalendarsService) {}

  /**
   * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
   * @throws {ConflictError} el Calendario conectado está `DISCONNECTED`
   * @throws {ExternalServiceError} Google respondió con error o no respondió
   */
  async execute(userId: number): Promise<{ calendars: CheckableCalendar[] }> {
    return { calendars: await this.calendars.list(userId) };
  }
}
