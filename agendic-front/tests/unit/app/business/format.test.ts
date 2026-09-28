import { depositFor, endTime, formatDuration } from '@/app/business/[negocioSlug]/[sucursalSlug]/_components/format';

describe('depositFor', () => {
    it('reparte el precio entre lo que se adelanta y lo que resta', () => {
        expect(depositFor({ price: 18000, depositPercent: 20 })).toEqual({ percent: 20, upfront: 3600, rest: 14400 });
    });

    it('redondea el adelanto y lo que resta sigue sumando el precio', () => {
        const deposit = depositFor({ price: 11500, depositPercent: 15 })!;
        expect(Number.isInteger(deposit.upfront)).toBe(true);
        expect(deposit.upfront + deposit.rest).toBe(11500);
    });

    it('un Servicio sin Seña no pide nada', () => {
        expect(depositFor({ price: 18000, depositPercent: null })).toBeNull();
    });
});

describe('endTime', () => {
    it('suma la duración', () => {
        expect(endTime('10:15', 45)).toBe('11:00');
        expect(endTime('09:00', 30)).toBe('09:30');
    });
});

describe('formatDuration', () => {
    it('distingue minutos, horas exactas y horas con resto', () => {
        expect(formatDuration(45)).toBe('45 min');
        expect(formatDuration(60)).toBe('1 h');
        expect(formatDuration(90)).toBe('1 h 30 min');
    });
});
