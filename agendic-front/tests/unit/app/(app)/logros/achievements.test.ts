import { achieved, dayInZone, earnedAt, inProgress, progressPercent, progressText } from '@/app/(app)/logros/_components/achievements';
import { medalLabel } from '@/app/_components/medal-style';
import type { MyBadge } from '@/src/entities/models/badge';

const silverGoingForGold: MyBadge = {
    badge: 'attended',
    name: 'Turnos atendidos',
    level: 'silver',
    progress: { current: 73, target: 100 },
    levels: [
        { level: 'bronze', target: 10, earnedAt: '2026-09-01T10:00:00.000Z' },
        { level: 'silver', target: 50, earnedAt: '2026-10-01T10:00:00.000Z' },
        { level: 'gold', target: 100, earnedAt: null },
    ],
};
const notStarted: MyBadge = {
    badge: 'five-stars',
    name: 'Cinco estrellas',
    level: null,
    progress: { current: 0, target: 10 },
    levels: [{ level: 'bronze', target: 10, earnedAt: null }],
};
const completed: MyBadge = {
    badge: 'first-booking',
    name: 'Primer Turno',
    level: 'bronze',
    progress: null,
    levels: [{ level: 'bronze', target: 1, earnedAt: '2026-08-15T23:30:00.000Z' }],
};

describe('groups', () => {
    it('puts an Insignia in both groups when it won a Nivel and goes for the next', () => {
        const all = [silverGoingForGold, notStarted, completed];

        expect(inProgress(all)).toEqual([silverGoingForGold, notStarted]);
        expect(achieved(all)).toEqual([silverGoingForGold, completed]);
    });
});

describe('progressText', () => {
    it('names the next Nivel without a date', () => {
        expect(progressText(silverGoingForGold)).toBe('73/100 para Oro');
        expect(progressText(notStarted)).toBe('0/10 para Bronce');
    });

    it('is null once the last Nivel is won', () => {
        expect(progressText(completed)).toBeNull();
    });
});

describe('progressPercent', () => {
    it('rounds and never passes 100', () => {
        expect(progressPercent({ current: 73, target: 100 })).toBe(73);
        expect(progressPercent({ current: 1, target: 3 })).toBe(33);
        expect(progressPercent({ current: 12, target: 10 })).toBe(100);
    });

    it('is 0 for a target of 0', () => {
        expect(progressPercent({ current: 0, target: 0 })).toBe(0);
    });
});

describe('earnedAt', () => {
    it('is the instant the current Nivel was won', () => {
        expect(earnedAt(silverGoingForGold)).toBe('2026-10-01T10:00:00.000Z');
    });

    it('is null without a Nivel', () => {
        expect(earnedAt(notStarted)).toBeNull();
    });
});

describe('dayInZone', () => {
    it('is the day in the given zone, which can differ from the UTC day', () => {
        expect(dayInZone('2026-10-02T01:30:00.000Z', 'UTC')).toBe('2026-10-02');
        expect(dayInZone('2026-10-02T01:30:00.000Z', 'America/Argentina/Buenos_Aires')).toBe('2026-10-01');
    });
});

describe('medalLabel', () => {
    it('names the Insignia and its Nivel', () => {
        expect(medalLabel('Turnos atendidos', 'gold')).toBe('Turnos atendidos, Nivel Oro');
    });

    it('says when there is no Nivel yet', () => {
        expect(medalLabel('Turnos atendidos', null)).toBe('Turnos atendidos, sin Nivel ganado');
    });
});
