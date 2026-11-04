import {
  BADGE_CATALOG,
  describeBadges,
  EarnedLevel,
  levelsReached,
  NO_METRICS,
} from './badges';

const earned = (
  badge: string,
  level: EarnedLevel['level'],
  at = '2026-01-01T00:00:00.000Z',
): EarnedLevel => ({
  badge,
  level,
  earnedAt: new Date(at),
  seenAt: null,
});

describe('BADGE_CATALOG', () => {
  it('has the 5 Insignias in order, each with ascending targets', () => {
    expect(BADGE_CATALOG.map((b) => b.key)).toEqual([
      'first-booking',
      'attended',
      'five-stars',
      'loyal-clients',
      'always-present',
    ]);
    for (const badge of BADGE_CATALOG) {
      const targets = badge.levels.map((l) => l.target);
      expect(targets).toEqual([...targets].sort((a, b) => a - b));
    }
  });

  it('uses bronze for an Insignia of a single Nivel', () => {
    const single = BADGE_CATALOG.filter((b) => b.levels.length === 1);
    expect(single.map((b) => b.levels[0].level)).toEqual(
      single.map(() => 'bronze'),
    );
  });
});

describe('levelsReached', () => {
  it('returns every Nivel up to the count, not only the highest', () => {
    const reached = levelsReached({ ...NO_METRICS, attended: 50 });
    expect(reached.filter((r) => r.badge === 'attended')).toEqual([
      { badge: 'attended', level: 'bronze' },
      { badge: 'attended', level: 'silver' },
    ]);
    expect(reached).toContainEqual({ badge: 'first-booking', level: 'bronze' });
  });

  it('returns nothing for a Usuario without work', () => {
    expect(levelsReached(NO_METRICS)).toEqual([]);
  });

  it('measures each Insignia with its own metric', () => {
    const reached = levelsReached({
      attended: 0,
      fiveStars: 5,
      loyalClients: 10,
      streak: 50,
    });
    expect(reached.map((r) => r.badge)).toEqual([
      'five-stars',
      'loyal-clients',
      'always-present',
    ]);
  });
});

describe('describeBadges', () => {
  it('has level null and progress toward the first Nivel when nothing is earned', () => {
    const [first, attended] = describeBadges(
      { ...NO_METRICS, attended: 3 },
      [],
    );
    expect(first).toMatchObject({
      badge: 'first-booking',
      name: 'Primer Turno',
      level: null,
      progress: { current: 3, target: 1 },
    });
    expect(attended).toMatchObject({
      level: null,
      progress: { current: 3, target: 10 },
      levels: [
        { level: 'bronze', target: 10, earnedAt: null },
        { level: 'silver', target: 50, earnedAt: null },
        { level: 'gold', target: 100, earnedAt: null },
        { level: 'platinum', target: 500, earnedAt: null },
      ],
    });
  });

  it('takes the level from what was earned, so it survives a lower count', () => {
    const [, attended] = describeBadges({ ...NO_METRICS, attended: 4 }, [
      earned('attended', 'bronze', '2026-02-01T00:00:00.000Z'),
    ]);
    expect(attended.level).toBe('bronze');
    expect(attended.progress).toEqual({ current: 4, target: 50 });
    expect(attended.levels[0].earnedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(attended.levels[1].earnedAt).toBeNull();
  });

  it('has progress null once the last Nivel is earned', () => {
    const all = describeBadges({ ...NO_METRICS, loyalClients: 12 }, [
      earned('loyal-clients', 'bronze'),
    ]);
    const loyal = all.find((b) => b.badge === 'loyal-clients');
    expect(loyal).toMatchObject({ level: 'bronze', progress: null });
  });
});
