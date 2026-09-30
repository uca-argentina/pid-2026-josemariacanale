import { availableDays } from '@/app/business/[negocioSlug]/[sucursalSlug]/_components/mock-slots';
import { toMinutes } from '@/app/business/[negocioSlug]/[sucursalSlug]/_components/format';

// ponytail: el mock de Horarios reservables vive hasta el ticket 07; estos tests se van con él.

const branch = { opensAt: '09:00', closesAt: '20:00' };

/** Los ids de Empleado que el mock usa. */
const EMPLOYEES = [1, 2, 3, 4];

describe('availableDays', () => {
    it('ofrece siete días', () => {
        expect(availableDays(branch, 30, 1)).toHaveLength(7);
    });

    // La condición de borde del generador: un Servicio no puede empezar tan tarde que termine
    // después de que la Sucursal cierra.
    it.each([30, 45, 60])('con %i min, ningún turno termina fuera de la franja de la Sucursal', (duration) => {
        for (const employeeId of EMPLOYEES) {
            for (const day of availableDays(branch, duration, employeeId)) {
                for (const slot of day.slots) {
                    expect(toMinutes(slot)).toBeGreaterThanOrEqual(toMinutes(branch.opensAt));
                    expect(toMinutes(slot) + duration).toBeLessThanOrEqual(toMinutes(branch.closesAt));
                }
            }
        }
    });

    it('usa la franja de la Sucursal que recibe', () => {
        const [first] = availableDays({ opensAt: '10:00', closesAt: '12:00' }, 60, 99)
            .filter((d) => d.slots.length > 0);
        expect(first.slots[0]).toBe('10:00');
        expect(first.slots.at(-1)).toBe('11:00');
    });

    it('un día sin horarios siempre dice por qué, y uno con horarios nunca', () => {
        for (const employeeId of EMPLOYEES) {
            for (const day of availableDays(branch, 60, employeeId)) {
                if (day.slots.length === 0) expect(day.reason).toBeDefined();
                else expect(day.reason).toBeUndefined();
            }
        }
    });

    // El caso que la UI tiene que poder mostrar: este profesional no tiene lugar, otro sí.
    it('deja algún día con un Empleado completo y otro con lugar', () => {
        const full = availableDays(branch, 60, 1).filter((d) => d.reason === 'fully-booked');
        expect(full.length).toBeGreaterThan(0);

        const anotherHasSlots = full.some((d) =>
            EMPLOYEES.filter((id) => id !== 1).some((id) =>
                availableDays(branch, 60, id).some((x) => x.date === d.date && x.slots.length > 0),
            ),
        );
        expect(anotherHasSlots).toBe(true);
    });

    it('no repite horarios dentro de un día', () => {
        for (const day of availableDays(branch, 45, 2)) {
            expect(new Set(day.slots).size).toBe(day.slots.length);
        }
    });
});
