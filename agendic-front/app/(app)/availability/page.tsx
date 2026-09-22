import { Topbar } from '../_components/Topbar';
import { DisponibilidadView } from './_components/DisponibilidadView';
import type { Schedule, ScheduleDetail } from '../_components/types';

// ponytail: mock data until the Availability domain exists in src/; swap for a controller call then.
const schedules: Schedule[] = [
    { id: 'general', name: 'Horario general', isDefault: true, summary: 'Lun – Vie, 09:00 – 18:00 · Sáb, 09:00 – 13:00', scope: '3 profesionales · 2 sucursales', timezone: 'GMT-3' },
    { id: 'tarde', name: 'Turno tarde', isDefault: false, summary: 'Lun – Vie, 14:00 – 21:00', scope: '1 profesional · Sucursal Palermo', timezone: 'GMT-3' },
    { id: 'finde', name: 'Fines de semana', isDefault: false, summary: 'Sáb – Dom, 10:00 – 15:00', scope: '2 profesionales · Sucursal Centro', timezone: 'GMT-3' },
];

const scheduleDetail: ScheduleDetail = {
    days: [
        { key: 'lun', label: 'Lunes', enabled: true, from: '09:00', to: '18:00' },
        { key: 'mar', label: 'Martes', enabled: true, from: '09:00', to: '18:00' },
        { key: 'mie', label: 'Miércoles', enabled: true, from: '09:00', to: '18:00' },
        { key: 'jue', label: 'Jueves', enabled: true, from: '09:00', to: '18:00' },
        { key: 'vie', label: 'Viernes', enabled: true, from: '09:00', to: '17:00' },
        { key: 'sab', label: 'Sábado', enabled: true, from: '09:00', to: '13:00' },
        { key: 'dom', label: 'Domingo', enabled: false, from: '09:00', to: '18:00' },
    ],
    timezone: 'America/Argentina/Buenos_Aires',
    overrides: [
        { date: 'Jue 25 de septiembre', note: 'Feriado · cerrado todo el día', kind: 'feriado' },
        { date: 'Vie 3 de octubre', note: 'Solo 09:00 – 13:00', kind: 'horario-reducido' },
        { date: 'Lun 13 – Vie 17 de octubre', note: 'Vacaciones de Martina F.', kind: 'vacaciones' },
    ],
    branches: [
        { name: 'Sucursal Centro', active: true },
        { name: 'Sucursal Palermo', active: true },
        { name: 'Sucursal Vicente López', active: false },
    ],
};

export default function AvailabilityPage() {
    return (
        <>
            <Topbar title="Disponibilidad" subtitle="Definí los horarios en los que tus clientes pueden reservar." />
            <DisponibilidadView schedules={schedules} detail={scheduleDetail} />
        </>
    );
}
