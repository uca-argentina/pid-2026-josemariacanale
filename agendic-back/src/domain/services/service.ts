import { Cabin } from '../cabins/cabin';
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
  /** Servicio del Negocio: its Sucursal. Null in a Servicio personal (ADR 0021). */
  branchId: number | null;
  /** Servicio personal: its Usuario. Null in a Servicio del Negocio. */
  userId: number | null;
  /** Servicio personal: the Usuario's own Availability it is attended with, which also gives its time zone. Null in a Servicio del Negocio. */
  availabilityId: number | null;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  /** Seña: symbolic, stored and shown, never charged. Null when the Servicio asks for none. */
  depositPercent: number | null;
  /** Aprobación manual: its verified Turnos are born PENDING instead of BOOKED. */
  requiresApproval: boolean;
  deletedAt: Date | null;
  /** Enlace de reserva's last tramo, lowercase; unique per Sucursal or per Usuario among Servicios not dados de baja. */
  slug: string;
  /** Servicio oculto: off the Sucursal's page, reachable only by its own Enlace de reserva. */
  hidden: boolean;
  /** Tiempo de preparación: one of PREP_MINUTES. Each Turno holds its Empleado from startsAt minus this. */
  prepMinutes: number;
  /** Límite diario: PENDING and BOOKED Turnos per local day of the Sucursal. Null when there is none. */
  dailyLimit: number | null;
  /** Intervalo: minutes between the starts of its Horarios reservables. Null means the duration. */
  slotInterval: number | null;
  /** Anticipación mínima: minutes that must remain before a Turno starts to Reservar it. 0 means none. */
  minimumNoticeMinutes: number;
  /** Repetición: weeks between the Turnos of a Serie. Null, together with repeatMaxBookings, when the Servicio offers none. */
  repeatEveryWeeks: number | null;
  /** Repetición: most Turnos a Serie may have, 2 to 10. Null exactly when repeatEveryWeeks is. */
  repeatMaxBookings: number | null;
  /** In charge of it: verified and not dados de baja. Always empty in a Servicio personal. */
  employees: ServiceEmployee[];
  /** Cabinas it admits (ADR 0030): the active ones, ascending by name. Always empty in a Servicio personal. */
  cabins: ServiceCabin[];
}

/** A Cabina a Servicio admits. */
export type ServiceCabin = Pick<Cabin, 'id' | 'name'>;

/** An Empleado in charge of a Servicio, with the Availability they attend it with. */
export type ServiceEmployee = EmployeeSummary & {
  availabilityId: number;
  /** The Usuario behind the Empleado: the one whose agenda a Turno occupies. */
  userId: number;
  /**
   * From the Usuario's foto de perfil; public along with the Empleado's name (ADR 0007).
   */
  imageUrl: string | null;
  /** The Usuario's Enlace de reserva, the last tramo of an Empleado elegido's link; null until they choose it. */
  slug: string | null;
};

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
  slotInterval?: number;
  minimumNoticeMinutes?: number;
  repeatEveryWeeks?: number | null;
  repeatMaxBookings?: number | null;
  employeeIds: number[];
  /** Cabinas of the Sucursal it admits. */
  cabinIds?: number[];
}

/** A Servicio personal's own fields: the Servicio del Negocio's, without Sucursal or Empleados, with its Availability. */
export type CreatePersonalServiceInput = Omit<
  CreateServiceInput,
  'employeeIds'
> & {
  availabilityId: number;
};

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
  /** Null drops the Intervalo. */
  slotInterval?: number | null;
  minimumNoticeMinutes?: number;
  /** Null, together with repeatMaxBookings, drops the Repetición. */
  repeatEveryWeeks?: number | null;
  repeatMaxBookings?: number | null;
  /** Servicio personal only: another of the Usuario's own Availabilities. */
  availabilityId?: number;
  /** Servicio del Negocio only: replaces the whole set of Cabinas it admits; empty leaves it with none. */
  cabinIds?: number[];
}
