import dayjs from 'dayjs';
import type { CalendarEvent } from '../types/events';

/** Ajustes del solapamiento; cada uno tiene un valor por defecto. */
export interface OverlapLayoutConfig {
    baseZIndex?: number;
    safetyMarginPercent?: number;
    minWidthPercent?: number;
    curveExponent?: number;
}

/** Dónde y a qué altura apilar un evento: `left%`, `width%` y `zIndex` dentro de su grupo de solapamiento. */
export interface EventLayout {
    event: CalendarEvent;
    leftOffsetPercent: number;
    widthPercent: number;
    baseZIndex: number;
    groupIndex: number;
    indexInGroup: number;
}

const DEFAULT_CONFIG: Required<OverlapLayoutConfig> = {
    baseZIndex: 60,
    safetyMarginPercent: 0.5,
    minWidthPercent: 25,
    curveExponent: 1.3,
};

/**
 * Ancho de cada evento de una cascada: el de más a la izquierda (el más largo) es el más ancho y el de la
 * derecha el más angosto. Con 2 a 4 eventos usa anclas fijas; con 5 o más, una curva suave.
 */
function calculateVariableWidths(groupSize: number, minWidthPercent: number, curveExponent: number): number[] {
    if (groupSize <= 1) return [100];

    let wFirst: number;
    let wLast: number;

    if (groupSize === 2) {
        wFirst = 80;
        wLast = 50;
    } else if (groupSize === 3) {
        wFirst = 55;
        wLast = 33;
    } else if (groupSize === 4) {
        wFirst = 40;
        wLast = 25;
    } else {
        wFirst = Math.max(30, 40 - 3 * (groupSize - 4));
        wLast = minWidthPercent;
    }

    const widths: number[] = [];
    for (let i = 0; i < groupSize; i++) {
        const t = i / (groupSize - 1);
        const easedT = Math.pow(1 - t, curveExponent);
        widths.push(Math.max(minWidthPercent, wLast + (wFirst - wLast) * easedT));
    }

    return widths;
}

const round3 = (value: number) => Number(value.toFixed(3));
const floor3 = (value: number) => Math.floor(value * 1000) / 1000;

/** Ordena por inicio ascendente y, a igual inicio, el más largo primero. No muta el arreglo. */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
        const startDiff = dayjs(a.start).diff(dayjs(b.start));
        if (startDiff !== 0) return startDiff;
        return dayjs(b.end).diff(dayjs(a.end));
    });
}

/** Agrupa los eventos que se pisan (uno empieza antes de que termine el grupo). Espera eventos ya ordenados. */
export function buildOverlapGroups(sortedEvents: CalendarEvent[]): CalendarEvent[][] {
    if (sortedEvents.length === 0) return [];

    const groups: CalendarEvent[][] = [];
    let currentGroup: CalendarEvent[] = [sortedEvents[0]];
    let currentGroupEnd = dayjs(sortedEvents[0].end);

    for (let i = 1; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        const eventEnd = dayjs(event.end);

        if (dayjs(event.start).isBefore(currentGroupEnd)) {
            currentGroup.push(event);
            if (eventEnd.isAfter(currentGroupEnd)) currentGroupEnd = eventEnd;
        } else {
            groups.push(currentGroup);
            currentGroup = [event];
            currentGroupEnd = eventEnd;
        }
    }

    groups.push(currentGroup);
    return groups;
}

/**
 * Posición (`left%`, `width%`) y `zIndex` de cada evento, en cascada dentro de su grupo de solapamiento. El
 * último de cada grupo queda pegado al borde derecho, con un margen de seguridad.
 */
export function calculateEventLayouts(events: CalendarEvent[], config: OverlapLayoutConfig = {}): EventLayout[] {
    const { baseZIndex, safetyMarginPercent, minWidthPercent, curveExponent } = { ...DEFAULT_CONFIG, ...config };

    const groups = buildOverlapGroups(sortEvents(events));
    const layouts: EventLayout[] = [];

    groups.forEach((group, groupIndex) => {
        const groupSize = group.length;
        const widths = calculateVariableWidths(groupSize, minWidthPercent, curveExponent);
        const Rmax = 100 - safetyMarginPercent;

        if (groupSize === 1) {
            layouts.push({
                event: group[0],
                leftOffsetPercent: 0,
                widthPercent: floor3(Math.min(widths[0], Rmax)),
                baseZIndex,
                groupIndex,
                indexInGroup: 0,
            });
            return;
        }

        const Rmin = widths[0];

        group.forEach((event, indexInGroup) => {
            const t = indexInGroup / (groupSize - 1);
            const ri = Rmin + (Rmax - Rmin) * t;
            const left = round3(ri - widths[indexInGroup]);
            const widthCap = Math.min(widths[indexInGroup], Rmax - left);

            layouts.push({
                event,
                leftOffsetPercent: left,
                widthPercent: floor3(Math.max(0, widthCap)),
                baseZIndex: baseZIndex + indexInGroup,
                groupIndex,
                indexInGroup,
            });
        });
    });

    return layouts;
}

/** Índice de los layouts por id de evento. */
export function createLayoutMap(layouts: EventLayout[]): Map<number, EventLayout> {
    return new Map(layouts.map((layout) => [layout.event.id, layout]));
}
