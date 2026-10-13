import type { CalendarEvent } from '@/app/_components/weekly-view/types';
import {
    buildOverlapGroups,
    calculateEventLayouts,
    createLayoutMap,
    sortEvents,
} from '@/app/_components/weekly-view/overlap';

const ev = (id: number, start: string, end: string): CalendarEvent => ({
    id,
    title: `Event ${id}`,
    start: new Date(`2024-01-01T${start}:00`),
    end: new Date(`2024-01-01T${end}:00`),
});

describe('overlap utility', () => {
    describe('sortEvents', () => {
        it('should sort events by start time ascending', () => {
            const sorted = sortEvents([ev(1, '10:00', '11:00'), ev(2, '09:00', '10:00'), ev(3, '11:00', '12:00')]);

            expect(sorted[0].id).toBe(2);
            expect(sorted[1].id).toBe(1);
            expect(sorted[2].id).toBe(3);
        });

        it('should sort events with same start time by end time descending (longer first)', () => {
            const sorted = sortEvents([ev(1, '10:00', '11:00'), ev(2, '10:00', '12:00'), ev(3, '10:00', '10:30')]);

            expect(sorted[0].id).toBe(2);
            expect(sorted[1].id).toBe(1);
            expect(sorted[2].id).toBe(3);
        });

        it('should not mutate the original array', () => {
            const events = [ev(1, '10:00', '11:00'), ev(2, '09:00', '10:00')];

            const originalFirstId = events[0].id;
            sortEvents(events);

            expect(events[0].id).toBe(originalFirstId);
        });
    });

    describe('buildOverlapGroups', () => {
        it('should return empty array for no events', () => {
            expect(buildOverlapGroups([])).toEqual([]);
        });

        it('should return single group for single event', () => {
            const groups = buildOverlapGroups([ev(1, '10:00', '11:00')]);

            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(1);
            expect(groups[0][0].id).toBe(1);
        });

        it('should group two overlapping events together', () => {
            const groups = buildOverlapGroups(sortEvents([ev(1, '10:00', '11:00'), ev(2, '10:30', '11:30')]));

            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(2);
            expect(groups[0][0].id).toBe(1);
            expect(groups[0][1].id).toBe(2);
        });

        it('should separate non-overlapping events into different groups', () => {
            const groups = buildOverlapGroups(sortEvents([ev(1, '10:00', '11:00'), ev(2, '11:00', '12:00')]));

            expect(groups).toHaveLength(2);
            expect(groups[0]).toHaveLength(1);
            expect(groups[1]).toHaveLength(1);
            expect(groups[0][0].id).toBe(1);
            expect(groups[1][0].id).toBe(2);
        });

        it('should handle chain overlaps (A overlaps B, B overlaps C)', () => {
            const groups = buildOverlapGroups(
                sortEvents([ev(1, '10:00', '11:00'), ev(2, '10:30', '11:30'), ev(3, '11:00', '12:00')]),
            );

            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(3);
            expect(groups[0][0].id).toBe(1);
            expect(groups[0][1].id).toBe(2);
            expect(groups[0][2].id).toBe(3);
        });

        it('should handle multiple separate overlap groups', () => {
            const groups = buildOverlapGroups(
                sortEvents([
                    ev(1, '09:00', '10:00'),
                    ev(2, '09:30', '10:30'),
                    ev(3, '11:00', '12:00'),
                    ev(4, '11:30', '12:30'),
                ]),
            );

            expect(groups).toHaveLength(2);
            expect(groups[0]).toHaveLength(2);
            expect(groups[1]).toHaveLength(2);
            expect(groups[0][0].id).toBe(1);
            expect(groups[0][1].id).toBe(2);
            expect(groups[1][0].id).toBe(3);
            expect(groups[1][1].id).toBe(4);
        });

        it('should handle events that start at the same time', () => {
            const groups = buildOverlapGroups(
                sortEvents([ev(1, '10:00', '12:00'), ev(2, '10:00', '11:00'), ev(3, '10:00', '10:30')]),
            );

            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(3);
        });
    });

    describe('calculateEventLayouts', () => {
        it('should calculate layout for single event', () => {
            const layouts = calculateEventLayouts([ev(1, '10:00', '11:00')]);

            expect(layouts).toHaveLength(1);
            expect(layouts[0].event.id).toBe(1);
            expect(layouts[0].leftOffsetPercent).toBe(0);
            expect(layouts[0].widthPercent).toBe(99.5);
            expect(layouts[0].baseZIndex).toBe(60);
            expect(layouts[0].groupIndex).toBe(0);
            expect(layouts[0].indexInGroup).toBe(0);
        });

        it('should calculate cascading layout for two overlapping events', () => {
            const layouts = calculateEventLayouts([ev(1, '10:00', '11:00'), ev(2, '10:30', '11:30')]);

            expect(layouts).toHaveLength(2);

            expect(layouts[0].event.id).toBe(1);
            expect(layouts[0].leftOffsetPercent).toBe(0);
            expect(layouts[0].widthPercent).toBe(80);
            expect(layouts[0].baseZIndex).toBe(60);

            expect(layouts[1].event.id).toBe(2);
            expect(layouts[1].leftOffsetPercent).toBe(49.5);
            expect(layouts[1].widthPercent).toBe(50);
            expect(layouts[1].baseZIndex).toBe(61);
        });

        it('should calculate cascading layout for three overlapping events', () => {
            const layouts = calculateEventLayouts([
                ev(1, '10:00', '11:00'),
                ev(2, '10:30', '11:30'),
                ev(3, '11:00', '12:00'),
            ]);

            expect(layouts).toHaveLength(3);

            expect(layouts[0].leftOffsetPercent).toBe(0);
            expect(layouts[1].leftOffsetPercent).toBeCloseTo(35.315, 1);
            expect(layouts[2].leftOffsetPercent).toBe(66.5);

            expect(layouts[0].baseZIndex).toBe(60);
            expect(layouts[1].baseZIndex).toBe(61);
            expect(layouts[2].baseZIndex).toBe(62);
        });

        it('should respect custom baseZIndex configuration', () => {
            const layouts = calculateEventLayouts([ev(1, '10:00', '11:00'), ev(2, '10:30', '11:30')], {
                baseZIndex: 50,
            });

            expect(layouts[0].baseZIndex).toBe(50);
            expect(layouts[1].baseZIndex).toBe(51);
        });

        it('should handle non-overlapping events in separate groups', () => {
            const layouts = calculateEventLayouts([ev(1, '10:00', '11:00'), ev(2, '11:00', '12:00')]);

            expect(layouts).toHaveLength(2);

            expect(layouts[0].groupIndex).toBe(0);
            expect(layouts[0].indexInGroup).toBe(0);
            expect(layouts[0].leftOffsetPercent).toBe(0);

            expect(layouts[1].groupIndex).toBe(1);
            expect(layouts[1].indexInGroup).toBe(0);
            expect(layouts[1].leftOffsetPercent).toBe(0);
        });

        it('should prevent overflow with many overlapping events (dense scenario)', () => {
            const layouts = calculateEventLayouts([
                ev(1, '09:00', '09:30'),
                ev(2, '09:15', '10:00'),
                ev(3, '09:45', '11:00'),
                ev(4, '10:00', '10:30'),
                ev(5, '10:15', '11:30'),
                ev(6, '11:00', '12:00'),
                ev(7, '11:30', '12:30'),
                ev(8, '12:00', '13:30'),
                ev(9, '12:30', '13:00'),
                ev(10, '13:00', '14:00'),
                ev(11, '13:15', '14:00'),
            ]);

            layouts.forEach((layout) => {
                const totalWidth = layout.leftOffsetPercent + layout.widthPercent;
                expect(totalWidth).toBeLessThanOrEqual(100 - 0.5);
            });

            expect(layouts).toHaveLength(11);
        });

        it('should respect safety margin with 20+ overlapping events', () => {
            const events: CalendarEvent[] = Array.from({ length: 21 }, (_, i) => ({
                id: i + 1,
                title: `Event ${i + 1}`,
                start: new Date(`2024-01-01T09:${String(i * 2).padStart(2, '0')}:00`),
                end: new Date(`2024-01-01T10:${String(i * 2).padStart(2, '0')}:00`),
            }));

            const layouts = calculateEventLayouts(events);

            expect(layouts).toHaveLength(21);

            layouts.forEach((layout) => {
                const totalWidth = layout.leftOffsetPercent + layout.widthPercent;
                expect(totalWidth).toBeLessThanOrEqual(100 - 0.5);
            });

            const lastLayout = layouts[layouts.length - 1];
            expect(lastLayout.leftOffsetPercent + lastLayout.widthPercent).toBeLessThanOrEqual(99.5);
        });

        it('should compress offset step for dense overlaps while maintaining cascade', () => {
            const events: CalendarEvent[] = Array.from({ length: 12 }, (_, i) => ({
                id: i + 1,
                title: `Event ${i + 1}`,
                start: new Date(`2024-01-01T10:${String(i * 5).padStart(2, '0')}:00`),
                end: new Date(`2024-01-01T11:${String(i * 5).padStart(2, '0')}:00`),
            }));

            const layouts = calculateEventLayouts(events);

            expect(layouts).toHaveLength(12);

            layouts.forEach((layout, index) => {
                expect(layout.leftOffsetPercent + layout.widthPercent).toBeLessThanOrEqual(100);

                if (index > 0) {
                    expect(layout.leftOffsetPercent).toBeGreaterThan(layouts[index - 1].leftOffsetPercent);
                }
            });

            const lastLayout = layouts[layouts.length - 1];
            expect(lastLayout.leftOffsetPercent + lastLayout.widthPercent).toBeLessThanOrEqual(100);
        });

        it('should use dynamic width for three overlapping events', () => {
            const layouts = calculateEventLayouts([
                ev(1, '10:00', '11:00'),
                ev(2, '10:30', '11:30'),
                ev(3, '11:00', '12:00'),
            ]);

            expect(layouts[0].widthPercent).toBe(55);
            expect(layouts[1].widthPercent).toBeCloseTo(41.9, 0);
            expect(layouts[2].widthPercent).toBe(33);

            expect(layouts[0].leftOffsetPercent).toBe(0);
            expect(layouts[1].leftOffsetPercent).toBeCloseTo(35.315, 1);
            expect(layouts[2].leftOffsetPercent).toBe(66.5);
        });
    });

    describe('createLayoutMap', () => {
        it('should create a map from event ID to layout', () => {
            const layouts = calculateEventLayouts([ev(1, '10:00', '11:00'), ev(2, '10:30', '11:30')]);
            const map = createLayoutMap(layouts);

            expect(map.size).toBe(2);
            expect(map.get(1)?.event.id).toBe(1);
            expect(map.get(2)?.event.id).toBe(2);
            expect(map.get(1)?.leftOffsetPercent).toBe(0);
            expect(map.get(2)?.leftOffsetPercent).toBe(49.5);
            expect(map.get(1)?.widthPercent).toBe(80);
            expect(map.get(2)?.widthPercent).toBe(50);
        });

        it('should handle empty layouts', () => {
            expect(createLayoutMap([]).size).toBe(0);
        });
    });
});
