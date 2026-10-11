import { OutOfOffice } from '../../domain/out-of-office/out-of-office';

/** El período como lo responde la API (ADR 0007). */
export const presentOutOfOffice = ({
  id,
  startDate,
  endDate,
  reason,
  notes,
  showNotePublicly,
}: OutOfOffice) => ({
  id,
  startDate,
  endDate,
  reason,
  notes,
  showNotePublicly,
});
