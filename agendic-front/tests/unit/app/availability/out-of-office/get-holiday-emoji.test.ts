import { getHolidayEmoji } from '@/app/(app)/availability/out-of-office/_components/get-holiday-emoji';

describe('getHolidayEmoji', () => {
    it.each([
        ['Navidad', '🎄'],
        ['Año Nuevo', '🎆'],
        ['Año Nuevo Chino', '🐉'],
        ['Domingo de Pascua', '🐣'],
        ['Viernes Santo', '✝️'],
        ['Día del Trabajo', '👷'],
        ['Día de la Independencia', '🎆'],
        ['Janucá', '🕎'],
    ])('%s → %s', (name, emoji) => {
        expect(getHolidayEmoji(name)).toBe(emoji);
    });

    it('ignores case', () => {
        expect(getHolidayEmoji('NAVIDAD')).toBe('🎄');
    });

    it('falls back to 📅 when no keyword matches', () => {
        expect(getHolidayEmoji('Feriado puente turístico')).toBe('📅');
    });
});
