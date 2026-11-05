import {
  BadgeMetrics,
  EarnedLevel,
  NO_METRICS,
} from '../../domain/badges/badges';
import {
  ANA,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  scriptSession,
  TestApp,
} from '../../test-app';

describe('badges', () => {
  let t: TestApp;
  let metrics: BadgeMetrics;
  let stored: (EarnedLevel & { userId: number })[];

  /** Stands in for the table of Niveles ganados: saves what it is given and lists it back. */
  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    metrics = { ...NO_METRICS };
    stored = [];
    t.badges.measure.mockImplementation(
      async (ids) => new Map(ids.map((id) => [id, metrics])),
    );
    t.badges.listEarned.mockImplementation(async (ids) => {
      const map = new Map<number, EarnedLevel[]>();
      for (const row of stored.filter((s) => ids.includes(s.userId))) {
        map.set(row.userId, [...(map.get(row.userId) ?? []), row]);
      }
      return map;
    });
    t.badges.saveEarned.mockImplementation(async (levels) => {
      for (const l of levels) {
        if (
          !stored.some(
            (s) =>
              s.userId === l.userId &&
              s.badge === l.badge &&
              s.level === l.level,
          )
        ) {
          stored.push({ ...l, seenAt: null });
        }
      }
    });
    t.badges.markSeen.mockImplementation(async (userId, seenAt) => {
      for (const s of stored)
        if (s.userId === userId && !s.seenAt) s.seenAt = seenAt;
    });
  });
  afterEach(() => t.app.close());

  const getBadges = () =>
    t.http.get('/users/me/badges').set(bearer(CLERK_TOKEN));

  describe('GET /users/me/badges', () => {
    it('answers one entry per Insignia, in the order of the catalog', async () => {
      const res = await getBadges().expect(200);

      expect(res.body.map((b: { badge: string }) => b.badge)).toEqual([
        'first-booking',
        'attended',
        'five-stars',
        'loyal-clients',
        'always-present',
      ]);
      expect(res.body[0]).toEqual({
        badge: 'first-booking',
        name: 'Primer Turno',
        level: null,
        progress: { current: 0, target: 1 },
        levels: [{ level: 'bronze', target: 1, earnedAt: null }],
      });
    });

    it('saves every Nivel reached at once, the intermediate ones included', async () => {
      metrics = { ...NO_METRICS, attended: 50 };

      const res = await getBadges().expect(200);

      const attended = res.body[1];
      expect(attended.level).toBe('silver');
      expect(attended.progress).toEqual({ current: 50, target: 100 });
      expect(
        attended.levels.map(
          (l: { earnedAt: string | null }) => l.earnedAt !== null,
        ),
      ).toEqual([true, true, false, false]);
      expect(stored.map((s) => `${s.badge}/${s.level}`).sort()).toEqual([
        'attended/bronze',
        'attended/silver',
        'first-booking/bronze',
      ]);
    });

    it('has a null progress once the last Nivel is earned', async () => {
      metrics = { ...NO_METRICS, loyalClients: 10 };

      const res = await getBadges().expect(200);

      expect(res.body[3]).toMatchObject({ level: 'bronze', progress: null });
    });

    it('keeps a Nivel earned after the count drops, and does not save it twice', async () => {
      metrics = { ...NO_METRICS, attended: 10 };
      await getBadges().expect(200);
      metrics = { ...NO_METRICS, attended: 4 };

      const res = await getBadges().expect(200);

      expect(res.body[1].level).toBe('bronze');
      expect(res.body[1].progress).toEqual({ current: 4, target: 50 });
      expect(stored.filter((s) => s.badge === 'attended')).toHaveLength(1);
    });

    it('evaluates only the Usuario of the Sesión', async () => {
      await getBadges().expect(200);

      expect(t.badges.measure).toHaveBeenCalledWith([ANA.id], t.clock.now());
    });

    it('is 401 without a Sesión', async () => {
      await t.http.get('/users/me/badges').expect(401);
    });
  });

  describe('GET /users/me/badges/unseen', () => {
    const unseen = () =>
      t.http.get('/users/me/badges/unseen').set(bearer(CLERK_TOKEN));

    it('answers the Niveles not seen yet, ordered by earnedAt', async () => {
      stored.push({
        userId: ANA.id,
        badge: 'five-stars',
        level: 'bronze',
        earnedAt: new Date('2026-01-01T09:00:00.000Z'),
        seenAt: null,
      });
      metrics = { ...NO_METRICS, fiveStars: 5, attended: 1 };

      const res = await unseen().expect(200);

      expect(res.body).toEqual([
        {
          badge: 'five-stars',
          name: 'Cinco estrellas',
          level: 'bronze',
          earnedAt: '2026-01-01T09:00:00.000Z',
        },
        {
          badge: 'first-booking',
          name: 'Primer Turno',
          level: 'bronze',
          earnedAt: t.clock.now().toISOString(),
        },
      ]);
    });

    it('answers only what was not seen', async () => {
      stored.push({
        userId: ANA.id,
        badge: 'first-booking',
        level: 'bronze',
        earnedAt: new Date('2026-01-01T09:00:00.000Z'),
        seenAt: new Date('2026-01-01T10:00:00.000Z'),
      });
      metrics = { ...NO_METRICS, attended: 1 };

      await unseen().expect(200, []);
    });

    it('is 401 without a Sesión', async () => {
      await t.http.get('/users/me/badges/unseen').expect(401);
    });
  });

  describe('POST /users/me/badges/seen', () => {
    it('is 204 and leaves nothing unseen afterwards', async () => {
      metrics = { ...NO_METRICS, attended: 10 };
      const before = await t.http
        .get('/users/me/badges/unseen')
        .set(bearer(CLERK_TOKEN));
      expect(before.body).toHaveLength(2);

      await t.http
        .post('/users/me/badges/seen')
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.badges.markSeen).toHaveBeenCalledWith(ANA.id, t.clock.now());
      await t.http
        .get('/users/me/badges/unseen')
        .set(bearer(CLERK_TOKEN))
        .expect(200, []);
    });

    it('is 401 without a Sesión', async () => {
      await t.http.post('/users/me/badges/seen').expect(401);
    });
  });
});
