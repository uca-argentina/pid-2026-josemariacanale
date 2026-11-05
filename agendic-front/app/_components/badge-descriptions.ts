/** Qué hay que hacer para conseguir cada Insignia del catálogo, por clave. Los Niveles piden más de lo mismo. */
const DESCRIPTIONS: Record<string, string> = {
    'first-booking': 'Atendé tu primer Turno.',
    attended: 'Atendé Turnos: cada Nivel te pide más.',
    'five-stars': 'Recibí Calificaciones de 5 estrellas de tus Clientes.',
    'loyal-clients': 'Lográ que tus Clientes vuelvan: cada uno con 3 o más Turnos atendidos con vos.',
    'always-present': 'Atendé Turnos seguidos sin ninguna Ausencia del Anfitrión.',
};

/** La descripción de una Insignia por su clave, o `null` si no está en el catálogo del front (una Insignia nueva del back). */
export const badgeDescription = (badge: string): string | null => DESCRIPTIONS[badge] ?? null;
