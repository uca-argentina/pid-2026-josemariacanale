import type { OutOfOfficeReason } from '@/src/entities/models/out-of-office';

/** El emoji y la etiqueta de cada Motivo: el único lugar donde se definen, en el orden de la lista fija del glosario. */
export const OUT_OF_OFFICE_REASONS: Record<OutOfOfficeReason, { emoji: string; label: string }> = {
    UNSPECIFIED: { emoji: '🕒', label: 'No especificado' },
    VACATION: { emoji: '🏝️', label: 'Vacaciones' },
    TRAVEL: { emoji: '✈️', label: 'Viaje' },
    SICK_LEAVE: { emoji: '🤒', label: 'Baja por enfermedad' },
    PUBLIC_HOLIDAY: { emoji: '📅', label: 'Día festivo' },
};
