import { Inject, Injectable } from '@nestjs/common';
import { CalendarConnection } from '../../domain/calendar/calendar-connection';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';

/** Devuelve el Calendario conectado del Usuario, o `null` si no conectó ninguno. */
@Injectable()
export class GetCalendarConnectionUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
  ) {}

  /** @throws {DatabaseOperationError} la base falló */
  async execute(userId: number): Promise<CalendarConnection | null> {
    return this.connections.findByUserId(userId);
  }
}
