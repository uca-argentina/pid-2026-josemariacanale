import { closeCelebration } from '@/app/(app)/_components/celebration-queue';

describe('closeCelebration', () => {
    it('advances without marking seen while there are more Niveles', () => {
        expect(closeCelebration(0, 3)).toEqual({ next: 1, markSeen: false });
        expect(closeCelebration(1, 3)).toEqual({ next: 2, markSeen: false });
    });

    it('marks everything as seen only when the last one closes', () => {
        expect(closeCelebration(2, 3)).toEqual({ next: 3, markSeen: true });
    });

    it('marks seen right away when there is a single Nivel', () => {
        expect(closeCelebration(0, 1)).toEqual({ next: 1, markSeen: true });
    });
});
