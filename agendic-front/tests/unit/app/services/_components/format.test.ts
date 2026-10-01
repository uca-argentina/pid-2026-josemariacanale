import { formatPrice, retiredMessage, stoppedOfferingMessage } from '@/app/(app)/services/_components/format';

describe('formatPrice', () => {
    it('muestra pesos sin decimales, igual que la página pública', () => {
        expect(formatPrice(18000)).toBe('$18.000');
    });
});

describe('retiredMessage', () => {
    it('avisa que no había Turnos por cancelar', () => {
        expect(retiredMessage('Masaje', 0)).toBe('Masaje: dado de baja. No tenía Turnos por delante.');
    });

    it('habla de un Turno en singular', () => {
        expect(retiredMessage('Masaje', 1)).toBe('Masaje: dado de baja. Se canceló 1 Turno.');
    });

    it('cuenta los Turnos cancelados', () => {
        expect(retiredMessage('Masaje', 4)).toBe('Masaje: dado de baja. Se cancelaron 4 Turnos.');
    });
});

describe('stoppedOfferingMessage', () => {
    it('habla del propio Usuario', () => {
        expect(stoppedOfferingMessage('Masaje', null, 0)).toBe('Dejaste de ofrecer Masaje. No tenías Turnos por delante.');
        expect(stoppedOfferingMessage('Masaje', null, 1)).toBe('Dejaste de ofrecer Masaje. Se canceló 1 Turno.');
    });

    it('habla de otro Empleado', () => {
        expect(stoppedOfferingMessage('Masaje', 'Juan', 3)).toBe('Juan dejó de ofrecer Masaje. Se cancelaron 3 Turnos.');
        expect(stoppedOfferingMessage('Masaje', 'Juan', 0)).toBe('Juan dejó de ofrecer Masaje. No tenía Turnos por delante.');
    });
});
