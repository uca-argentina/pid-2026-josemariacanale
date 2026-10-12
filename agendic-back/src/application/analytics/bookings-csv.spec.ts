import { BookingRow } from '../../domain/analytics/analytics.repository';
import { bookingsCsv } from './bookings-csv';

const ROW: BookingRow = {
  startsAt: '2026-03-02 10:00',
  serviceName: 'Corte',
  branchName: 'Centro',
  employeeName: 'Ana Pérez',
  clientName: 'Cami',
  clientEmail: 'cami@example.com',
  status: 'BOOKED',
  rescheduled: false,
  attended: false,
  noShow: false,
  employeeNoShow: false,
  price: 1500.5,
  rating: null,
};

const lines = (csv: string) => csv.slice(1).split('\r\n');

describe('bookingsCsv', () => {
  it('starts with the UTF-8 BOM and the Spanish header', () => {
    const csv = bookingsCsv([]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines(csv)[0]).toBe(
      'Fecha y hora,Servicio,Sucursal,Empleado,Cliente,Email,Estado,Atendido,Ausencia,Falta del Empleado,Precio,Calificación',
    );
  });

  it('writes a row per Turno, in order, with Sí/No flags and an empty Calificación', () => {
    const csv = bookingsCsv([
      { ...ROW, attended: true, rating: 4 },
      { ...ROW, startsAt: '2026-03-03 09:30', noShow: true },
    ]);

    expect(lines(csv).slice(1, 3)).toEqual([
      '2026-03-02 10:00,Corte,Centro,Ana Pérez,Cami,cami@example.com,Aceptado,Sí,No,No,1500.5,4',
      '2026-03-03 09:30,Corte,Centro,Ana Pérez,Cami,cami@example.com,Aceptado,No,Sí,No,1500.5,',
    ]);
  });

  it.each([
    [{ status: 'PENDING' }, 'Pendiente'],
    [{ status: 'BOOKED' }, 'Aceptado'],
    [{ status: 'REJECTED' }, 'Rechazado'],
    [{ status: 'CANCELLED' }, 'Cancelado'],
    [{ status: 'CANCELLED', rescheduled: true }, 'Reagendado'],
  ] as [Partial<BookingRow>, string][])(
    'labels %j as %s',
    (override, label) => {
      expect(
        lines(bookingsCsv([{ ...ROW, ...override }]))[1].split(',')[6],
      ).toBe(label);
    },
  );

  it('leaves Sucursal and Empleado empty in a personal Servicio', () => {
    const csv = bookingsCsv([{ ...ROW, branchName: null, employeeName: null }]);

    expect(lines(csv)[1]).toContain(',Corte,,,Cami,');
  });

  it('escapes commas, quotes and line breaks as RFC 4180 says', () => {
    const csv = bookingsCsv([
      { ...ROW, clientName: 'Pérez, "Cami"', serviceName: 'Corte\ny barba' },
    ]);

    expect(csv).toContain(
      '"Corte\ny barba",Centro,Ana Pérez,"Pérez, ""Cami""",',
    );
  });
});
