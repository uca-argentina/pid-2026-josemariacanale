import { formatPrice, retiredMessage } from '@/app/(app)/services/_components/format';

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
