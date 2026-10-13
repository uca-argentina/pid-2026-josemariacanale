import React from 'react';
import dayjs from 'dayjs';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { CalendarComponentProps, CalendarPublicActions, CalendarState, CalendarStoreProps } from '../types/state';
import { mergeOverlappingDateRanges, weekdayDates } from '../utils';

const defaultState: CalendarComponentProps = {
    view: 'week',
    startDate: weekdayDates(0, new Date()).startDate,
    endDate: weekdayDates(0, new Date()).endDate,
    events: [],
    startHour: 0,
    endHour: 23,
    gridCellsPerHour: 4,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeFormat: 24,
    showBackgroundPattern: true,
    showBorder: true,
    borderColor: 'default',
    showTimezone: false,
};

/** Crea el store de una grilla; cada `Calendar` tiene el suyo. `initState` junta los `blockingDates` que se pisan para no pintar dos veces la misma celda bloqueada. */
export function createCalendarStore(initial?: Partial<CalendarComponentProps>): StoreApi<CalendarStoreProps> {
    return createStore<CalendarStoreProps>((set) => ({
        ...defaultState,
        ...initial,
        setView: (view) => set({ view }),
        setStartDate: (startDate) => set({ startDate }),
        setEndDate: (endDate) => set({ endDate }),
        setEvents: (events) => set({ events }),
        initState: (state: CalendarState & CalendarPublicActions) => {
            let events = state.events;
            if (state.sortEvents) {
                events = [...state.events].sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());
            }
            const blockingDates = mergeOverlappingDateRanges(state.blockingDates || []);

            set({ ...state, blockingDates, events, selectedBookingUid: state.selectedBookingUid });
        },
        setSelectedEvent: (event) => set({ selectedEvent: event }),
        handleDateChange: (payload) =>
            set((state) => {
                const { startDate, endDate } = state;
                const unit = state.view ?? 'week';
                if (payload === 'INCREMENT') {
                    const newStartDate = dayjs(startDate).add(1, unit).toDate();
                    const newEndDate = dayjs(endDate).add(1, unit).toDate();
                    if ((state.minDate && newStartDate < state.minDate) || (state.maxDate && newEndDate > state.maxDate)) {
                        return { startDate, endDate };
                    }
                    state.onDateChange?.(newStartDate, newEndDate);
                    return { startDate: newStartDate, endDate: newEndDate };
                }
                const newStartDate = dayjs(startDate).subtract(1, unit).toDate();
                const newEndDate = dayjs(endDate).subtract(1, unit).toDate();
                state.onDateChange?.(newStartDate, newEndDate);
                return { startDate: newStartDate, endDate: newEndDate };
            }),
    }));
}

/** El store de la grilla que está más arriba en el árbol. */
export const CalendarStoreContext = React.createContext<StoreApi<CalendarStoreProps> | null>(null);

/**
 * Lee el store de la grilla. Un selector que devuelve un objeto va envuelto en `useShallow`.
 *
 * @throws {Error} se usa fuera de un `Calendar`
 */
export function useCalendarStore<T>(selector: (state: CalendarStoreProps) => T): T {
    const store = React.useContext(CalendarStoreContext);
    if (!store) {
        throw new Error('useCalendarStore must be used within a CalendarStoreProvider');
    }
    return useStore(store, selector);
}
