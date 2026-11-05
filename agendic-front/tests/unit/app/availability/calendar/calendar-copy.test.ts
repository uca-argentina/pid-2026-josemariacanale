import {
    CALENDAR_PROVIDER_NAMES,
    calendarDisconnectedNotice,
    calendarNotConfiguredMessage,
    calendarsUnavailableMessage,
    otherCalendarProvider,
} from '@/app/(app)/_components/calendar-copy';

describe('calendar copy', () => {
    it('picks the other provider', () => {
        expect(otherCalendarProvider('GOOGLE')).toBe('MICROSOFT');
        expect(otherCalendarProvider('MICROSOFT')).toBe('GOOGLE');
    });

    it.each([
        ['GOOGLE', 'Google'],
        ['MICROSOFT', 'Microsoft'],
    ] as const)('names %s in every message', (provider, name) => {
        expect(CALENDAR_PROVIDER_NAMES[provider]).toContain(name);
        expect(calendarDisconnectedNotice(provider)).toContain(name);
        expect(calendarNotConfiguredMessage(provider)).toContain(name);
        expect(calendarsUnavailableMessage(provider)).toContain(name);
    });
});
