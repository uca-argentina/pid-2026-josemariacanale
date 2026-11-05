import { CALENDAR_RETURN_MESSAGES, parseCalendarReturn } from '@/app/(app)/availability/calendar/calendar-return';

describe('parseCalendarReturn', () => {
    it.each(['connected', 'denied', 'missing-scope', 'error'])('accepts %s', (value) => {
        expect(parseCalendarReturn(value)).toBe(value);
    });

    it.each([undefined, '', 'otro', 'CONNECTED'])('ignores %p', (value) => {
        expect(parseCalendarReturn(value)).toBeNull();
    });
});

describe('CALENDAR_RETURN_MESSAGES', () => {
    it('has a different message for each way of coming back', () => {
        const messages = Object.values(CALENDAR_RETURN_MESSAGES).map(({ message }) => message);
        expect(new Set(messages).size).toBe(4);
    });

    it('explains on denied that a company account may need its administrator', () => {
        expect(CALENDAR_RETURN_MESSAGES.denied.message).toContain('administrador');
    });

    it('is a success only for connected', () => {
        expect(CALENDAR_RETURN_MESSAGES.connected.kind).toBe('success');
        expect(CALENDAR_RETURN_MESSAGES.denied.kind).toBe('error');
    });
});
