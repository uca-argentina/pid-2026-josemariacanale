import {
    availableDays,
    branch,
    depositFor,
    endTime,
    formatDuration,
    services,
} from '@/app/businessPage/_components/mock-business';

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** Los ids de Empleado que el mock usa. */
const EMPLOYEES = [1, 2, 3, 4];

describe('availableDays', () => {
    it('ofrece siete días', () => {
        expect(availableDays(30, 1)).toHaveLength(7);
    });

    // La condición de borde del generador: un Servicio no puede empezar tan tarde que termine
    // después de que la Sucursal cierra.
    it.each([30, 45, 60])('con %i min, ningún turno termina después del cierre', (duration) => {
        const opens = toMinutes(branch.opensAt);
        const closes = toMinutes(branch.closesAt);

        for (const employeeId of EMPLOYEES) {
            for (const day of availableDays(duration, employeeId)) {
                for (const slot of day.slots) {
                    expect(toMinutes(slot)).toBeGreaterThanOrEqual(opens);
                    expect(toMinutes(slot) + duration).toBeLessThanOrEqual(closes);
                }
            }
        }
    });

    it('un día sin horarios siempre dice por qué, y uno con horarios nunca', () => {
        for (const employeeId of EMPLOYEES) {
            for (const day of availableDays(60, employeeId)) {
                if (day.slots.length === 0) expect(day.reason).toBeDefined();
                else expect(day.reason).toBeUndefined();
            }
        }
    });

    it('cierra la Sucursal el mismo día para todos los Empleados', () => {
        const closed = EMPLOYEES.map((id) =>
            availableDays(60, id)
                .filter((d) => d.reason === 'branch-closed')
                .map((d) => d.date)
                .join(),
        );
        expect(new Set(closed).size).toBe(1);
        expect(closed[0]).not.toBe('');
    });

    // El caso que la UI tiene que poder mostrar: este profesional no tiene lugar, otro sí.
    it('deja algún día con un Empleado completo y otro con lugar', () => {
        const full = availableDays(60, 1).filter((d) => d.reason === 'fully-booked');
        expect(full.length).toBeGreaterThan(0);

        const anotherHasSlots = full.some((d) =>
            EMPLOYEES.filter((id) => id !== 1).some((id) =>
                availableDays(60, id).some((x) => x.date === d.date && x.slots.length > 0),
            ),
        );
        expect(anotherHasSlots).toBe(true);
    });

    it('le deja horarios libres a cada Empleado en algún día', () => {
        for (const employeeId of EMPLOYEES) {
            expect(availableDays(60, employeeId).some((d) => d.slots.length > 0)).toBe(true);
        }
    });

    it('no repite horarios dentro de un día', () => {
        for (const day of availableDays(45, 2)) {
            expect(new Set(day.slots).size).toBe(day.slots.length);
        }
    });

    // Una duración más larga entra menos veces en la misma franja.
    it('ofrece menos horarios cuanto más largo es el Servicio', () => {
        const total = (d: number) =>
            availableDays(d, 3).reduce((sum, day) => sum + day.slots.length, 0);
        expect(total(90)).toBeLessThan(total(30));
    });
});

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
