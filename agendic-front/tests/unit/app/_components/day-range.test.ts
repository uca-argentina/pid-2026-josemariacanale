import { fromCalendarRange, toCalendarRange } from '@/app/_components/day-range';

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
    if (ORIGINAL_TZ === undefined) delete process.env.TZ;
    else process.env.TZ = ORIGINAL_TZ;
});

const period = { startDate: '2026-10-11', endDate: '2026-10-13' };

describe.each(['UTC', 'America/Argentina/Buenos_Aires', 'Pacific/Auckland', 'Pacific/Kiritimati', 'America/Los_Angeles'])(
    'out-of-office-range in %s',
    (timeZone) => {
        beforeEach(() => {
            process.env.TZ = timeZone;
        });

        it('round-trips without losing a day', () => {
            expect(fromCalendarRange(toCalendarRange(period))).toEqual(period);
        });

        it('round-trips a single-day period', () => {
            const oneDay = { startDate: '2026-12-31', endDate: '2026-12-31' };
            expect(fromCalendarRange(toCalendarRange(oneDay))).toEqual(oneDay);
        });

        it('reads the calendar days as the browser shows them', () => {
            const { from, to } = toCalendarRange(period);
            expect([from.getFullYear(), from.getMonth(), from.getDate()]).toEqual([2026, 9, 11]);
            expect([to.getFullYear(), to.getMonth(), to.getDate()]).toEqual([2026, 9, 13]);
        });
    },
);

describe('fromCalendarRange', () => {
    it('treats a range with only a start as a single day', () => {
        expect(fromCalendarRange({ from: new Date(2026, 9, 11) })).toEqual({ startDate: '2026-10-11', endDate: '2026-10-11' });
    });

    it('returns null while no day is picked', () => {
        expect(fromCalendarRange(undefined)).toBeNull();
        expect(fromCalendarRange({ from: undefined })).toBeNull();
    });
});
