import {
    formatUtcToLocalTime,
    getWeekdayShort,
    getDayOfMonth,
    getDateRangeForSlots,
    mapBackendDaysToAvailableDays,
} from '@/app/businessPage/_components/slots-utils';

describe('slots-utils', () => {
    describe('formatUtcToLocalTime', () => {
        it('formats UTC ISO to local timeZone HH:mm', () => {
            // 12:00 UTC is 09:00 in America/Argentina/Buenos_Aires (UTC-3)
            const result = formatUtcToLocalTime('2026-10-05T12:00:00.000Z', 'America/Argentina/Buenos_Aires');
            expect(result).toBe('09:00');
        });

        it('formats another afternoon hour correctly', () => {
            // 20:30 UTC is 17:30 in America/Argentina/Buenos_Aires (UTC-3)
            const result = formatUtcToLocalTime('2026-10-05T20:30:00.000Z', 'America/Argentina/Buenos_Aires');
            expect(result).toBe('17:30');
        });
    });

    describe('getWeekdayShort', () => {
        it('returns correct day name in Spanish', () => {
            // 2026-10-05 is Monday (Lun)
            expect(getWeekdayShort('2026-10-05')).toBe('Lun');
            // 2026-10-06 is Tuesday (Mar)
            expect(getWeekdayShort('2026-10-06')).toBe('Mar');
            // 2026-10-10 is Saturday (Sáb)
            expect(getWeekdayShort('2026-10-10')).toBe('Sáb');
            // 2026-10-11 is Sunday (Dom)
            expect(getWeekdayShort('2026-10-11')).toBe('Dom');
        });
    });

    describe('getDayOfMonth', () => {
        it('returns numeric day of month', () => {
            expect(getDayOfMonth('2026-10-05')).toBe(5);
            expect(getDayOfMonth('2026-10-28')).toBe(28);
        });
    });

    describe('getDateRangeForSlots', () => {
        it('calculates range of N days', () => {
            const start = new Date('2026-10-01T00:00:00Z');
            const range = getDateRangeForSlots(start, 14);
            expect(range.from).toBe('2026-10-01');
            expect(range.to).toBe('2026-10-14');
        });

        it('does not exceed 31 days', () => {
            const start = new Date('2026-10-01T00:00:00Z');
            const range = getDateRangeForSlots(start, 31);
            expect(range.from).toBe('2026-10-01');
            expect(range.to).toBe('2026-10-31');
        });
    });

    describe('mapBackendDaysToAvailableDays', () => {
        it('maps backend days into UI available days with slots formatted in local time', () => {
            const backendDays = [
                {
                    date: '2026-10-05',
                    slots: ['2026-10-05T12:00:00.000Z', '2026-10-05T12:30:00.000Z'],
                },
                {
                    date: '2026-10-06',
                    slots: [],
                    reason: 'NOT_WORKING' as const,
                },
                {
                    date: '2026-10-07',
                    slots: [],
                    reason: 'FULLY_BOOKED' as const,
                },
            ];

            const result = mapBackendDaysToAvailableDays(backendDays, 'America/Argentina/Buenos_Aires');

            expect(result).toEqual([
                {
                    date: '2026-10-05',
                    dayOfMonth: 5,
                    weekday: 'Lun',
                    slots: ['09:00', '09:30'],
                    reason: undefined,
                },
                {
                    date: '2026-10-06',
                    dayOfMonth: 6,
                    weekday: 'Mar',
                    slots: [],
                    reason: 'NOT_WORKING',
                },
                {
                    date: '2026-10-07',
                    dayOfMonth: 7,
                    weekday: 'Mié',
                    slots: [],
                    reason: 'FULLY_BOOKED',
                },
            ]);
        });
    });
});
