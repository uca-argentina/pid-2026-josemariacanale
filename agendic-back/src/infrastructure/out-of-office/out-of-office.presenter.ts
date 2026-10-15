import { LeftOutsideBooking } from '../../application/bookings/left-outside-bookings.service';
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

/** Un Turno que queda afuera como lo responde la vista previa (ADR 0007): sin datos de contacto del Cliente. */
export const presentLeftOutside = ({
  id,
  startsAt,
  endsAt,
  clientTimeZone,
  serviceName,
  clientName,
  business,
  branch,
  cancellationCause,
  cancellationReason,
}: LeftOutsideBooking) => ({
  id,
  startsAt,
  endsAt,
  timeZone: clientTimeZone,
  serviceName,
  clientName,
  business,
  branch,
  cancellationCause,
  cancellationReason,
});
