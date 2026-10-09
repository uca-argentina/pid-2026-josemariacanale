import type { ChartConfig } from '@/app/_components/ui/chart';
import { SERVICE_CATEGORIES, type ServiceCategoryValue } from '@/app/_components/business-schemas';

/** El último día con datos: el gráfico filtra hacia atrás desde acá, como el bloque `dashboard-01`. */
export const REFERENCE_DATE = '2026-09-30';

/** Turnos por día, aceptados y cancelados, de los 90 días hasta `REFERENCE_DATE`. Inventados pero estables. */
export const bookingsByDay = Array.from({ length: 91 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 30 - 90 + i));
    const day = date.getUTCDay();
    const base = day === 0 ? 4 : day === 6 ? 18 : 28;
    return {
        date: date.toISOString().slice(0, 10),
        accepted: base + ((i * 17) % 13),
        cancelled: Math.round(base / 8) + ((i * 7) % 4),
    };
});

/** Las series de los dos gráficos de Turnos: aceptados en el primario, cancelados en un celeste visible sobre blanco. */
export const bookingsChartConfig = {
    accepted: { label: 'Aceptados', color: '#2d5bff' },
    cancelled: { label: 'Cancelados', color: '#66b2ff' },
} satisfies ChartConfig;

/** Turnos de un Servicio por mes, para el detalle. */
export const bookingsByMonth = [
    { month: 'Abril', accepted: 186, cancelled: 18 },
    { month: 'Mayo', accepted: 205, cancelled: 24 },
    { month: 'Junio', accepted: 237, cancelled: 12 },
    { month: 'Julio', accepted: 173, cancelled: 19 },
    { month: 'Agosto', accepted: 209, cancelled: 13 },
    { month: 'Septiembre', accepted: 214, cancelled: 14 },
];

/** Los Empleados de ejemplo, para mostrar y asignar en la tabla. */
export const EMPLOYEES = ['Ana López', 'Bruno Díaz', 'Carla Méndez', 'Diego Ferreyra'];

/** La etiqueta de cada Categoría de Servicio, la misma lista que el resto del front. */
export const CATEGORY_LABELS = Object.fromEntries(SERVICE_CATEGORIES.map((c) => [c.value, c.label])) as Record<
    ServiceCategoryValue,
    string
>;

/** Una fila de la tabla de Servicios. `employee` es `null` en un Servicio sin Empleado. */
export interface ServiceRow {
    id: number;
    name: string;
    category: ServiceCategoryValue;
    hidden: boolean;
    bookings: number;
    dailyLimit: number;
    employee: string | null;
}

/** Los 15 Servicios de ejemplo de la tabla. */
export const services: ServiceRow[] = [
    { id: 1, name: 'Consulta clínica', category: 'CLINICA', hidden: false, bookings: 86, dailyLimit: 12, employee: 'Ana López' },
    { id: 2, name: 'Control pediátrico', category: 'CLINICA', hidden: false, bookings: 54, dailyLimit: 8, employee: 'Carla Méndez' },
    { id: 3, name: 'Masaje descontracturante', category: 'SPA', hidden: false, bookings: 72, dailyLimit: 10, employee: 'Bruno Díaz' },
    { id: 4, name: 'Limpieza facial', category: 'SPA', hidden: true, bookings: 31, dailyLimit: 6, employee: null },
    { id: 5, name: 'Clase de spinning', category: 'GIMNASIO', hidden: false, bookings: 140, dailyLimit: 30, employee: 'Diego Ferreyra' },
    { id: 6, name: 'Entrenamiento personalizado', category: 'GIMNASIO', hidden: false, bookings: 48, dailyLimit: 8, employee: 'Diego Ferreyra' },
    { id: 7, name: 'Evaluación física', category: 'GIMNASIO', hidden: true, bookings: 12, dailyLimit: 4, employee: null },
    { id: 8, name: 'Clase de inglés', category: 'ACADEMIA', hidden: false, bookings: 64, dailyLimit: 10, employee: 'Carla Méndez' },
    { id: 9, name: 'Apoyo escolar de matemática', category: 'ACADEMIA', hidden: false, bookings: 38, dailyLimit: 6, employee: 'Ana López' },
    { id: 10, name: 'Taller de guitarra', category: 'ACADEMIA', hidden: false, bookings: 22, dailyLimit: 5, employee: null },
    { id: 11, name: 'Kinesiología', category: 'CLINICA', hidden: false, bookings: 91, dailyLimit: 14, employee: 'Bruno Díaz' },
    { id: 12, name: 'Piedras calientes', category: 'SPA', hidden: false, bookings: 27, dailyLimit: 5, employee: 'Bruno Díaz' },
    { id: 13, name: 'Yoga', category: 'GIMNASIO', hidden: false, bookings: 103, dailyLimit: 20, employee: 'Ana López' },
    { id: 14, name: 'Asesoría de imagen', category: 'OTRO', hidden: true, bookings: 9, dailyLimit: 3, employee: 'Carla Méndez' },
    { id: 15, name: 'Corte de pelo', category: 'OTRO', hidden: false, bookings: 118, dailyLimit: 16, employee: null },
];
