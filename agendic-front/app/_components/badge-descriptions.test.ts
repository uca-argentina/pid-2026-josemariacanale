import { badgeDescription } from './badge-descriptions';

describe('badgeDescription', () => {
    it.each(['first-booking', 'attended', 'five-stars', 'loyal-clients', 'always-present'])('describes the catalog badge %s', (badge) => {
        expect(badgeDescription(badge)).toEqual(expect.any(String));
    });

    it('returns null for a badge the front does not know yet', () => {
        expect(badgeDescription('new-badge')).toBeNull();
    });
});
