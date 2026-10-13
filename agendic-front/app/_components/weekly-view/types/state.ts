import type { OutOfOfficeReason } from '@/src/entities/models/out-of-office';
import type { BorderColor } from './common';
import type { CalendarEvent } from './events';

/** Vista de la grilla; solo `week` y `day` andan. */
export type View = 'month' | 'week' | 'day';

/** Una hora del día, de 0 a 23. */
export type Hours = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

/** Formato de hora del panel: 12 o 24 horas. */
export type TimeFormat = 12 | 24;

/** Tramo de tiempo, con inicio y fin. */
export type TimeRange = { start: Date; end: Date };

/** Callbacks que quien usa la grilla le pasa por props. */
export type CalendarPublicActions = {
    onViewChange?: (view: View) => void;
    onEventClick?: (event: CalendarEvent) => void;
    onEventContextMenu?: (event: CalendarEvent) => void;
    onEmptyCellClick?: (date: Date) => void;
    onDateChange?: (startDate: Date, endDate?: Date) => void;
};

/** Acciones internas del store, que no son props del componente. */
export type CalendarPrivateActions = {
    /** Copia las props al store sin pisar el estado interno. */
    initState: (state: CalendarState & CalendarPublicActions) => void;
    setView: (view: CalendarComponentProps['view']) => void;
    setStartDate: (startDate: CalendarComponentProps['startDate']) => void;
    setEndDate: (endDate: CalendarComponentProps['endDate']) => void;
    setEvents: (events: CalendarComponentProps['events']) => void;
    selectedEvent?: CalendarEvent;
    setSelectedEvent: (event: CalendarEvent) => void;
    handleDateChange: (payload: 'INCREMENT' | 'DECREMENT') => void;
};

/** Un Horario reservable de la grilla; con `away`, el Usuario está Fuera de la oficina y lleva su Motivo y su nota. */
export type TimeRangeExtended = TimeRange & {
    away?: boolean;
    reason?: OutOfOfficeReason;
    notes?: string | null;
    showNotePublicly?: boolean;
};

/** Horarios reservables por día, con la clave `YYYY-MM-DD`. */
export type CalendarAvailableTimeslots = {
    [key: string]: TimeRangeExtended[];
};

/** Lo que muestra la celda de un día Fuera de la oficina. */
export type OutOfOfficeRenderProps = {
    reason?: OutOfOfficeReason;
    notes?: string | null;
    showNotePublicly?: boolean;
    borderDashed?: boolean;
    date?: string;
    className?: string;
};

/** Props de datos de la grilla. */
export type CalendarState = {
    /** Solo `week` y `day` andan; `week` es la más completa. */
    view?: View;
    startDate: Date;
    endDate: Date;
    /** Ordenados por inicio; si no, pasar `sortEvents`. */
    events: CalendarEvent[];
    /** Con esto, solo estas celdas se pueden elegir. */
    availableTimeslots?: CalendarAvailableTimeslots;
    /** Tramos que se pintan bloqueados. */
    blockingDates?: TimeRange[];
    loading?: boolean;
    /** Desactiva las acciones sobre los eventos. */
    eventsDisabled?: boolean;
    /** No se navega antes de esta fecha. */
    minDate?: Date;
    /** No se navega después de esta fecha. */
    maxDate?: Date;
    /** @default 0 */
    startHour?: Hours;
    /** @default 23 */
    endHour?: Hours;
    /** Al montar, scrollea hasta la hora actual. */
    scrollToCurrentTime?: boolean;
    showCurrentTimeLine?: boolean;
    /** Celdas por hora: 4 son 15 minutos. @default 4 */
    gridCellsPerHour?: number;
    /** Minutos de la celda que se resalta al pasar el cursor; 0 la apaga. */
    hoverEventDuration?: number;
    /** Ordena los eventos por inicio. */
    sortEvents?: boolean;
    hideHeader?: boolean;
    /** Zona en la que se leen las horas. */
    timezone: string;
    /** @default 24 */
    timeFormat?: TimeFormat;
    /** Rayado de fondo en lo que no está disponible. @default true */
    showBackgroundPattern?: boolean;
    /** Bordes a izquierda y derecha. @default true */
    showBorder?: boolean;
    /** @default "default" */
    borderColor?: BorderColor;
    /** Muestra la zona al lado de los días. @default false */
    showTimezone?: boolean;
    /** Resalta el evento con este `bookingUid`. */
    selectedBookingUid?: string | null;
    /** Recalcula la hora actual al volver a la pestaña. @default false */
    updateCurrentTimeOnFocus?: boolean;
};

/** Props del componente `Calendar`. */
export type CalendarComponentProps = CalendarPublicActions & CalendarState & { isPending?: boolean };

/** Todo lo que guarda el store. */
export type CalendarStoreProps = CalendarComponentProps & CalendarPrivateActions;
