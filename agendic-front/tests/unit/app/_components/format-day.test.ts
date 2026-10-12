import { formatOutOfOfficeDate } from '@/app/_components/format-day';

describe('formatOutOfOfficeDate', () => {
    it.each([
        ['2026-10-11', '11 oct. 2026'],
        ['2026-01-05', '5 ene. 2026'],
        ['2026-12-31', '31 dic. 2026'],
    ])('formats %s as %s', (date, expected) => {
        expect(formatOutOfOfficeDate(date)).toBe(expected);
    });
});
