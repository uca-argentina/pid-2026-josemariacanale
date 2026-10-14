import { chooseEmployee, chooseService, initialDraft } from '@/app/_components/booking/booking-draft';
import type { BookingDraft, ChosenEmployee, Service, Slot } from '@/app/_components/booking/types';

const ana: ChosenEmployee = { id: 1, name: 'Ana', imageUrl: null };
const beto: ChosenEmployee = { id: 2, name: 'Beto', imageUrl: null };

const service = (id: number): Service => ({
    id,
    name: `Servicio ${id}`,
    description: null,
    category: 'CLINICA',
    durationMinutes: 30,
    price: 1000,
    depositPercent: null,
    employees: [],
});

const slot: Slot = { startsAt: '2026-10-20T13:00:00.000Z', time: '10:00' };

const picked = (overrides: Partial<BookingDraft> = {}): BookingDraft => ({
    service: service(1),
    employee: ana,
    date: '2026-10-20',
    slot,
    ...overrides,
});

describe('initialDraft', () => {
    it('arranca con el Servicio y el Empleado del enlace', () => {
        expect(initialDraft(service(1), ana)).toEqual({ service: service(1), employee: ana, date: null, slot: null });
    });

    it('sin Empleado en el enlace, el Empleado es Cualquiera (null)', () => {
        expect(initialDraft(service(1), null).employee).toBeNull();
    });

    it('sin nada en el enlace, todo vacío', () => {
        expect(initialDraft(null, null)).toEqual({ service: null, employee: null, date: null, slot: null });
    });
});

describe('chooseService', () => {
    it('un Servicio distinto resetea fecha, horario y Empleado', () => {
        expect(chooseService(picked(), service(2))).toEqual({ service: service(2), employee: null, date: null, slot: null });
    });

    it('elegir el mismo Servicio no toca nada', () => {
        const draft = picked();
        expect(chooseService(draft, service(1))).toBe(draft);
    });
});

describe('chooseEmployee', () => {
    it('un Empleado distinto resetea fecha y horario', () => {
        expect(chooseEmployee(picked(), beto)).toEqual({ service: service(1), employee: beto, date: null, slot: null });
    });

    it('volver a Cualquiera también es un cambio', () => {
        expect(chooseEmployee(picked(), null)).toEqual({ service: service(1), employee: null, date: null, slot: null });
    });

    it('elegir el mismo Empleado no toca nada', () => {
        const draft = picked();
        expect(chooseEmployee(draft, ana)).toBe(draft);
    });

    it('elegir Cualquiera estando en Cualquiera no toca nada', () => {
        const draft = picked({ employee: null });
        expect(chooseEmployee(draft, null)).toBe(draft);
    });
});
