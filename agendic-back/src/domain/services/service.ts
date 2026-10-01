import { EmployeeSummary } from '../employees/employee';

export enum ServiceCategory {
  CLINICA = 'CLINICA',
  SPA = 'SPA',
  GIMNASIO = 'GIMNASIO',
  ACADEMIA = 'ACADEMIA',
  OTRO = 'OTRO',
}

/** Tiempo de preparación: the only minutes a Servicio may hold its Empleado before each Turno. */
export const PREP_MINUTES = [0, 5, 10, 15, 30, 60] as const;

export interface Service {
  id: number;
  branchId: number;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  /** Seña: symbolic, stored and shown, never charged. Null when the Servicio asks for none. */
  depositPercent: number | null;
  /** Aprobación manual: its verified Turnos are born PENDING instead of BOOKED. */
  requiresApproval: boolean;
  retiredAt: Date | null;
  /** Enlace de reserva's last tramo, lowercase; unique per Sucursal among Servicios not dados de baja. */
  slug: string;
  /** Servicio oculto: off the Sucursal's page, reachable only by its own Enlace de reserva. */
  hidden: boolean;
  /** Tiempo de preparación: one of PREP_MINUTES. Each Turno holds its Empleado from startsAt minus this. */
  prepMinutes: number;
  /** Límite diario: PENDING and BOOKED Turnos per local day of the Sucursal. Null when there is none. */
  dailyLimit: number | null;
  /** In charge of it: verified and not dados de baja. */
  employees: ServiceEmployee[];
}

/** An Empleado in charge of a Servicio, with the Availability they attend it with. */
export type ServiceEmployee = EmployeeSummary & { availabilityId: number };

/** An Empleado attending a Servicio with one of their own Availabilities: a reference, not a copy. */
export interface EmployeeService {
  serviceId: number;
  employeeId: number;
  availabilityId: number;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  depositPercent?: number;
  requiresApproval?: boolean;
  slug: string;
  hidden?: boolean;
  prepMinutes?: number;
  dailyLimit?: number;
  employeeIds: number[];
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  durationMinutes?: number;
  price?: number;
  /** Null drops the Seña. */
  depositPercent?: number | null;
  requiresApproval?: boolean;
  slug?: string;
  hidden?: boolean;
  prepMinutes?: number;
  /** Null drops the Límite diario. */
  dailyLimit?: number | null;
}
