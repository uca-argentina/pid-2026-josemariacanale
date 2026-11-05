import { Inject, Injectable } from '@nestjs/common';
import {
  CALENDAR_CONNECTIONS_REPOSITORY,
  CalendarConnectionsRepository,
} from '../../domain/calendar/calendar-connections.repository';
import { BusinessRuleError } from '../../domain/errors';
import {
  CheckableCalendar,
  ConnectedCalendarsService,
} from './connected-calendars.service';
import { ListExternalBusyService } from './list-external-busy.service';

/** Guarda qué calendarios de la cuenta cuentan como Ocupado externo; una lista vacía no lee ninguno. */
@Injectable()
export class SetCheckedCalendarsUseCase {
  constructor(
    private readonly calendars: ConnectedCalendarsService,
    @Inject(CALENDAR_CONNECTIONS_REPOSITORY)
    private readonly connections: CalendarConnectionsRepository,
    private readonly externalBusy: ListExternalBusyService,
  ) {}

  /**
   * Responde con la misma lista que `ListCalendarsUseCase`, ya con la selección nueva.
   *
   * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
   * @throws {ConflictError} el Calendario conectado está `DISCONNECTED`
   * @throws {BusinessRuleError} un id no es de la cuenta conectada
   * @throws {ExternalServiceError} Google respondió con error o no respondió
   */
  async execute(
    userId: number,
    checkedIds: string[],
  ): Promise<{ calendars: CheckableCalendar[] }> {
    const calendars = await this.calendars.list(userId);
    const known = new Set(calendars.map((calendar) => calendar.id));
    const unknown = checkedIds.find((id) => !known.has(id));
    if (unknown !== undefined)
      throw new BusinessRuleError(
        `Calendar ${unknown} is not in the connected account`,
      );
    const ids = [...new Set(checkedIds)];
    await this.connections.saveCheckedCalendarIds(userId, ids);
    // The one-minute cache would keep serving the old selection.
    this.externalBusy.forget(userId);
    return {
      calendars: calendars.map((calendar) => ({
        ...calendar,
        checked: ids.includes(calendar.id),
      })),
    };
  }
}
