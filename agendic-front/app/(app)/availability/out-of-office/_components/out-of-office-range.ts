import type { DateRange } from '@daypicker/react';
import type { SaveOutOfOffice } from '@/src/entities/models/out-of-office';

type Days = Pick<SaveOutOfOffice, 'startDate' | 'endDate'>;

const pad = (n: number) => String(n).padStart(2, '0');

/** Un `Date` local → su día `YYYY-MM-DD` tal como lo ve el browser, sin pasar por UTC. */
export const toIsoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** `YYYY-MM-DD` → medianoche local de ese día, que es lo que el Calendar marca. */
export const toLocalDay = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date);
};

/** Las fechas del back (`YYYY-MM-DD`, inclusivas) como el rango del Calendar. */
export const toCalendarRange = ({ startDate, endDate }: Days): { from: Date; to: Date } => ({
    from: toLocalDay(startDate),
    to: toLocalDay(endDate),
});

/**
 * El rango del Calendar como las fechas del back. Con un solo extremo elegido, el período es de un día; sin
 * ninguno, `null`.
 */
export function fromCalendarRange(range: DateRange | undefined): Days | null {
    if (!range?.from) return null;
    const startDate = toIsoDay(range.from);
    return { startDate, endDate: range.to ? toIsoDay(range.to) : startDate };
}
