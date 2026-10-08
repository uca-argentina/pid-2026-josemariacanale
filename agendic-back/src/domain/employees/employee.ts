export interface Employee {
  id: number;
  userId: number;
  businessId: number;
  /** From the Usuario, not stored on the Empleado. */
  name: string;
  email: string;
  /** From the Usuario's foto de perfil, not stored on the Empleado. */
  imageUrl: string | null;
  /** When dado de baja; null while employed. */
  deletedAt: Date | null;
}

/** What anyone browsing a Sucursal sees of an Empleado: never their email. */
export type EmployeeSummary = Pick<Employee, 'id' | 'name'>;
