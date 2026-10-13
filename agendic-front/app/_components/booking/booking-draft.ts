import type { BookingDraft, ChosenEmployee, Service } from './types';

/** El borrador con que abre la reserva: el Servicio y el Empleado del enlace, si vinieron; sin ellos, `null`. */
export function initialDraft(service: Service | null, employee: ChosenEmployee | null): BookingDraft {
    return { service, employee, date: null, slot: null };
}

/**
 * Elige un Servicio. Uno distinto resetea fecha, horario y Empleado (vuelve a Cualquiera): el Empleado del enlace
 * puede no Ofrecer el Servicio nuevo. Elegir el mismo devuelve el mismo borrador, para no borrar lo ya elegido.
 */
export function chooseService(draft: BookingDraft, next: Service): BookingDraft {
    if (draft.service?.id === next.id) return draft;
    return initialDraft(next, null);
}

/**
 * Elige el Empleado (ADR 0026); `null` es Cualquiera. Uno distinto resetea fecha y horario, porque los horarios son
 * de otra persona. Elegir el mismo devuelve el mismo borrador.
 */
export function chooseEmployee(draft: BookingDraft, next: ChosenEmployee | null): BookingDraft {
    if ((draft.employee?.id ?? null) === (next?.id ?? null)) return draft;
    return { ...draft, employee: next, date: null, slot: null };
}
