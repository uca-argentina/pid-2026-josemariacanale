import { EmployeeSummary } from '../employees/employee';

export enum ServiceCategory {
  CLINICA = 'CLINICA',
  SPA = 'SPA',
  GIMNASIO = 'GIMNASIO',
  ACADEMIA = 'ACADEMIA',
  OTRO = 'OTRO',
}

export interface Service {
  id: number;
  branchId: number;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  depositPercent?: number | null;
  depositAmount?: number | null;
  retiredAt: Date | null;
  /** In charge of it: verified and not dados de baja. */
  employees: EmployeeSummary[];
}

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
  depositAmount?: number;
  employeeIds: number[];
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  durationMinutes?: number;
  price?: number;
  depositPercent?: number | null;
  depositAmount?: number | null;
}
