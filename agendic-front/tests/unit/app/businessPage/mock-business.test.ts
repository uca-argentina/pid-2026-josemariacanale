import {
    depositFor,
    endTime,
    formatDuration,
    services,
} from '@/app/businessPage/_components/mock-business';

describe('depositFor', () => {
    it('reparte el precio entre lo que se adelanta y lo que resta', () => {
        for (const service of services) {
            const deposit = depositFor(service);
            if (!service.depositPercent) {
                expect(deposit).toBeNull();
                continue;
            }
            expect(deposit!.upfront + deposit!.rest).toBe(service.price);
            expect(deposit!.upfront).toBeGreaterThan(0);
            expect(deposit!.upfront).toBeLessThan(service.price);
        }
    });

    it('hay Servicios con seña y Servicios sin seña', () => {
        expect(services.some((s) => depositFor(s))).toBe(true);
        expect(services.some((s) => !depositFor(s))).toBe(true);
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
