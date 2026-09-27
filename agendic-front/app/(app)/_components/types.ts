export type SectionId =
    | 'bookings'
    | 'availability'
    | 'services'
    | 'employees'
    | 'branches'
    | 'clients'
    | 'metrics'
    | 'business';

export type TabId = 'proximos' | 'pendientes' | 'pasados' | 'cancelados';

export type TurnoEstado = 'aceptado' | 'pendiente' | 'sena' | 'completado' | 'ausencia' | 'cancelado';

export interface NavItem {
    id: SectionId;
    label: string;
    count?: number;
}

export interface TurnoItem {
    id: string;
    start: string;
    end: string;
    service: string;
    client: string;
    profesional: string;
    branch: string;
    estado: TurnoEstado;
    price: string;
    payment: string;
}

export interface TurnoGroup {
    label: string;
    summary: string;
    items: TurnoItem[];
}

export type TurnosByTab = Record<TabId, TurnoGroup[]>;

export interface CurrentBusinessUser {
    name: string;
    initials: string;
    imageUrl?: string;
}
