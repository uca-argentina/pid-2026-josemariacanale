import { OutOfOffice } from '../../domain/out-of-office/out-of-office';

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
