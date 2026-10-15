import { CANCELLATION_REASON_MAX_LENGTH } from '@/src/entities/models/booking';

/** El 400 de un Motivo de cancelación demasiado largo, como lo ven el Usuario en el panel y el Cliente en el Enlace del Turno. */
export const CANCELLATION_REASON_TOO_LONG = `El motivo puede tener hasta ${CANCELLATION_REASON_MAX_LENGTH} caracteres.`;
