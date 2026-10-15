import { CancellationCause } from './booking';

/** Lo que hace falta para escribir el Motivo de cancelación de cada Causa de cancelación (ADR 0034). */
export type CancellationReasonInput =
  | {
      cause: CancellationCause.OUT_OF_OFFICE;
      /** Nombre del Usuario que atiende. */
      userName: string;
      /** Nota del período Fuera de la oficina; solo se usa si `showNotePublicly`. */
      notes: string | null;
      showNotePublicly: boolean;
    }
  | {
      cause: CancellationCause.PUBLIC_HOLIDAY;
      userName: string;
      /** Nombre del feriado. */
      holidayName: string;
    }
  | { cause: CancellationCause.SCHEDULE_CHANGE; userName: string };

const CLOSING = ' Podés reservar otro horario.';

/**
 * Escribe el Motivo de cancelación de un Turno cancelado por un cambio en el horario de quien lo atiende.
 *
 * Lo escribe Agendic y se le muestra al Cliente, así que no lleva ningún dato de contacto y no se recorta al tope de
 * 500 caracteres, que es el del body de la API.
 */
export const cancellationReasonFor = (input: CancellationReasonInput): string =>
  `${body(input)}${CLOSING}`;

const body = (input: CancellationReasonInput): string => {
  switch (input.cause) {
    case CancellationCause.OUT_OF_OFFICE: {
      const note = input.showNotePublicly ? input.notes?.trim() : undefined;
      if (!note) return `${input.userName} no va a estar disponible en ese horario.`;
      // The period's note is typed by the Usuario; closing it with a period keeps it from running into the closing phrase.
      return /[.!?…]$/.test(note) ? note : `${note}.`;
    }
    case CancellationCause.PUBLIC_HOLIDAY:
      return `${input.userName} no atiende por ${input.holidayName}.`;
    case CancellationCause.SCHEDULE_CHANGE:
      return `${input.userName} cambió sus horarios y ya no atiende en ese horario.`;
  }
};
