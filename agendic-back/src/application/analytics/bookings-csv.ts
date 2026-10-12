import { BookingRow } from '../../domain/analytics/analytics.repository';

const HEADER = [
  'Fecha y hora',
  'Servicio',
  'Sucursal',
  'Empleado',
  'Cliente',
  'Email',
  'Estado',
  'Atendido',
  'Ausencia',
  'Falta del Empleado',
  'Precio',
  'Calificación',
];

const STATUS: Record<BookingRow['status'], string> = {
  PENDING: 'Pendiente',
  BOOKED: 'Aceptado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

const cell = (value: string | number | null) => {
  const text = value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/**
 * El CSV de Turnos de analíticas: BOM UTF-8 (para que Excel lea los acentos), encabezado en castellano y una
 * fila por Turno, con líneas CRLF y escape de RFC 4180. Un original reagendado es `Reagendado`, no `Cancelado`.
 */
export const bookingsCsv = (rows: BookingRow[]): string =>
  '﻿' +
  [
    HEADER,
    ...rows.map((r) => [
      r.startsAt,
      r.serviceName,
      r.branchName,
      r.employeeName,
      r.clientName,
      r.clientEmail,
      r.rescheduled ? 'Reagendado' : STATUS[r.status],
      yesNo(r.attended),
      yesNo(r.noShow),
      yesNo(r.employeeNoShow),
      r.price,
      r.rating,
    ]),
  ]
    .map((line) => line.map(cell).join(','))
    .join('\r\n') +
  '\r\n';
