import { medalTooltip, splitMedals } from '@/app/(app)/business/[businessId]/employees/_components/employee-medals';

const badge = (name: string, level: 'bronze' | 'silver' | 'gold' | 'platinum' = 'gold') => ({ badge: name.toLowerCase(), name, level });

describe('splitMedals', () => {
    it('returns nothing visible and no rest for an Empleado without Insignias', () => {
        expect(splitMedals([])).toEqual({ visible: [], rest: [] });
    });

    it('shows every Insignia when there are 3 or fewer', () => {
        const badges = [badge('A'), badge('B'), badge('C')];
        expect(splitMedals(badges)).toEqual({ visible: badges, rest: [] });
    });

    it('shows the first 3 and leaves the rest for the "+N"', () => {
        const badges = [badge('A'), badge('B'), badge('C'), badge('D'), badge('E')];
        expect(splitMedals(badges)).toEqual({ visible: badges.slice(0, 3), rest: badges.slice(3) });
    });
});

describe('medalTooltip', () => {
    it('joins the name and the Nivel in Spanish', () => {
        expect(medalTooltip(badge('Turnos atendidos', 'gold'))).toBe('Turnos atendidos · Oro');
    });
});
