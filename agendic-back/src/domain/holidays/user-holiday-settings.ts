/** País o calendario religioso que el Usuario eligió para sus Días festivos y los que apagó (ADR 0027). */
export interface UserHolidaySettings {
  /** Código de `holiday-calendars.ts`; `null` sin país. */
  countryCode: string | null;
  /** `eventId` de los Días festivos apagados. */
  disabledIds: string[];
}

/** Día festivo de un Usuario, con el estado de su toggle. */
export interface HolidayWithStatus {
  id: string;
  name: string;
  /** YYYY-MM-DD. */
  date: string;
  enabled: boolean;
}

/** Los Días festivos que ve el Usuario: su país y los próximos, por fecha. */
export interface UserHolidays {
  countryCode: string | null;
  holidays: HolidayWithStatus[];
}

/** Turnos que caen en un Día festivo prendido del Usuario. */
export interface HolidayConflict {
  holidayId: string;
  holidayName: string;
  /** YYYY-MM-DD. */
  date: string;
  bookings: { id: number; startsAt: Date; clientName: string }[];
}
