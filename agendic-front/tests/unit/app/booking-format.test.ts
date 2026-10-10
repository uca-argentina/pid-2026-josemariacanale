import { addDays, depositFor, endTime, formatDuration, formatWeekRange, shortWeekday, todayIn, weekIndexOf, weekStart } from '@/app/_components/booking/format';

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

describe('todayIn', () => {
    afterEach(() => jest.useRealTimers());

    it('es la fecha local de la zona horaria, no la del reloj en UTC', () => {
        jest.useFakeTimers({ now: new Date('2026-09-29T02:00:00Z') });
        expect(todayIn('America/Argentina/Buenos_Aires')).toBe('2026-09-28');
        expect(todayIn('UTC')).toBe('2026-09-29');
    });
});

describe('addDays', () => {
    it('cruza meses y años', () => {
        expect(addDays('2026-09-28', 13)).toBe('2026-10-11');
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });
});

describe('shortWeekday', () => {
    it('nombra el día de la fecha sin depender de la zona horaria', () => {
        expect(shortWeekday('2026-09-28')).toBe('Lun');
        expect(shortWeekday('2026-10-04')).toBe('Dom');
    });
});

describe('weekStart', () => {
    it('la semana 0 arranca hoy y cada una corre siete días', () => {
        expect(weekStart('2026-10-10', 0)).toBe('2026-10-10');
        expect(weekStart('2026-10-10', 2)).toBe('2026-10-24');
    });
});

describe('weekIndexOf', () => {
    it('cuenta semanas móviles desde hoy', () => {
        expect(weekIndexOf('2026-10-10', '2026-10-10')).toBe(0);
        expect(weekIndexOf('2026-10-16', '2026-10-10')).toBe(0);
        expect(weekIndexOf('2026-10-17', '2026-10-10')).toBe(1);
    });

    it('cruza meses y años', () => {
        expect(weekIndexOf('2027-01-02', '2026-12-31')).toBe(0);
        expect(weekIndexOf('2027-01-07', '2026-12-31')).toBe(1);
    });

    it('un día anterior a hoy cae en la semana 0', () => {
        expect(weekIndexOf('2026-10-09', '2026-10-10')).toBe(0);
    });
});

describe('formatWeekRange', () => {
    it('una semana dentro de un mes nombra el mes una vez', () => {
        expect(formatWeekRange('2026-10-10')).toBe('10 – 16 de octubre');
    });

    it('una semana que cruza de mes nombra los dos', () => {
        expect(formatWeekRange('2026-09-28')).toBe('28 de septiembre – 4 de octubre');
    });
});
