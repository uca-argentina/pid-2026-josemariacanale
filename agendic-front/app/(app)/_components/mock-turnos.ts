import type { TurnosByTab } from './types';

// ponytail: mock data until the Turno domain exists in src/; swap for a controller call then.
export const turnosByTab: TurnosByTab = {
    proximos: [
        {
            label: 'Hoy · martes 15 de septiembre',
            summary: '4 turnos · 3 h 25 min ocupadas',
            items: [
                { id: 't1', start: '09:00', end: '09:45', service: 'Consulta inicial', client: 'Lucía Bermúdez', profesional: 'Martina F.', branch: 'Centro', estado: 'aceptado', price: '$18.000', payment: 'Seña pagada' },
                { id: 't2', start: '10:00', end: '10:30', service: 'Control de seguimiento', client: 'Emiliano Paz', profesional: 'Nicolás R.', branch: 'Centro', estado: 'aceptado', price: '$11.500', payment: 'Pago total' },
                { id: 't3', start: '11:30', end: '12:30', service: 'Evaluación integral', client: 'Carolina Ruiz', profesional: 'Martina F.', branch: 'Palermo', estado: 'sena', price: '$26.000', payment: 'Resta $20.800' },
                { id: 't4', start: '15:00', end: '15:40', service: 'Sesión express', client: 'Tomás Villalba', profesional: 'Sofía L.', branch: 'Centro', estado: 'aceptado', price: '$14.000', payment: 'Seña pagada' },
            ],
        },
        {
            label: 'Mañana · miércoles 16',
            summary: '2 turnos · 1 h 15 min ocupadas',
            items: [
                { id: 't5', start: '08:30', end: '09:15', service: 'Consulta inicial', client: 'Rocío Alfonso', profesional: 'Nicolás R.', branch: 'Vicente López', estado: 'aceptado', price: '$18.000', payment: 'Seña pagada' },
                { id: 't6', start: '12:00', end: '12:30', service: 'Control de seguimiento', client: 'Ignacio Duarte', profesional: 'Sofía L.', branch: 'Centro', estado: 'sena', price: '$11.500', payment: 'Resta $9.200' },
            ],
        },
    ],
    pendientes: [
        {
            label: 'Esperan tu respuesta',
            summary: 'Aceptalos o rechazalos',
            items: [
                { id: 't7', start: '17:00', end: '17:45', service: 'Consulta inicial', client: 'Damián Sosa', profesional: 'Martina F.', branch: 'Centro', estado: 'pendiente', price: '$18.000', payment: 'Sin cobrar' },
                { id: 't8', start: '18:30', end: '19:10', service: 'Sesión express', client: 'Valentina Ortiz', profesional: 'Sofía L.', branch: 'Palermo', estado: 'pendiente', price: '$14.000', payment: 'Sin cobrar' },
                { id: 't9', start: '19:15', end: '20:00', service: 'Evaluación integral', client: 'Julián Pereyra', profesional: 'Nicolás R.', branch: 'Centro', estado: 'pendiente', price: '$26.000', payment: 'Sin cobrar' },
            ],
        },
    ],
    pasados: [
        {
            label: 'Lunes 14 de septiembre',
            summary: '3 turnos · 1 ausencia',
            items: [
                { id: 't10', start: '09:30', end: '10:15', service: 'Consulta inicial', client: 'Bruno Cabrera', profesional: 'Martina F.', branch: 'Centro', estado: 'completado', price: '$18.000', payment: 'Cobrado' },
                { id: 't11', start: '11:00', end: '11:30', service: 'Control de seguimiento', client: 'Ailén Moreno', profesional: 'Sofía L.', branch: 'Centro', estado: 'ausencia', price: '$11.500', payment: 'Seña pagada' },
                { id: 't12', start: '16:00', end: '17:00', service: 'Evaluación integral', client: 'Federico Lema', profesional: 'Nicolás R.', branch: 'Palermo', estado: 'completado', price: '$26.000', payment: 'Cobrado' },
            ],
        },
    ],
    cancelados: [
        {
            label: 'Últimos 7 días',
            summary: '2 cancelaciones',
            items: [
                { id: 't13', start: '13:00', end: '13:45', service: 'Consulta inicial', client: 'Malena Ferrari', profesional: 'Martina F.', branch: 'Centro', estado: 'cancelado', price: '$18.000', payment: 'Reembolsado' },
                { id: 't14', start: '10:30', end: '11:00', service: 'Sesión express', client: 'Gonzalo Ibáñez', profesional: 'Sofía L.', branch: 'Vicente López', estado: 'cancelado', price: '$14.000', payment: 'Sin reembolso' },
            ],
        },
    ],
};

export const pendingCount = turnosByTab.pendientes.reduce((n, g) => n + g.items.length, 0);
