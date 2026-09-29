import type { AvailableDay, NoSlotsReason } from './types';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function formatUtcToLocalTime(utcIso: string, timeZone: string): string {
    const date = new Date(utcIso);
    return new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone,
    }).format(date);
}

export function getWeekdayShort(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return WEEKDAYS[date.getUTCDay()];
}

export function getDayOfMonth(dateStr: string): number {
    const parts = dateStr.split('-');
    return parseInt(parts[2], 10);
}

export function getDateRangeForSlots(startDate?: Date, daysCount = 14): { from: string; to: string } {
    const start = startDate ? new Date(startDate) : new Date();
    const from = start.toISOString().slice(0, 10);

    const [y, m, d] = from.split('-').map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + daysCount - 1));
    const to = end.toISOString().slice(0, 10);

    return { from, to };
}

export function mapBackendDaysToAvailableDays(
    days: Array<{
        date: string;
        slots: string[];
        reason?: 'NOT_WORKING' | 'FULLY_BOOKED' | 'COVERED';
        coveredByEmployeeId?: number | null;
    }>,
    timeZone: string,
): AvailableDay[] {
    return days.map((day) => {
        const localSlots = day.slots.map((slotUtc) => formatUtcToLocalTime(slotUtc, timeZone));
        return {
            date: day.date,
            dayOfMonth: getDayOfMonth(day.date),
            weekday: getWeekdayShort(day.date),
            slots: localSlots,
            reason: day.reason as NoSlotsReason | undefined,
        };
    });
}
