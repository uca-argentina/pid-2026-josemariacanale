import { CreateBranchInput } from '../branches/branch';
import { CreateServiceInput } from '../services/service';

export interface Business {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  /** Enlace de reserva: the lowercase address a Cliente reaches this Business by, at /business/<slug>. */
  slug: string;
  /** Cuándo se dio de baja con su Dueño (ADR 0024); `null` mientras está activo. */
  deletedAt: Date | null;
  /** Logo del Negocio: public URL in the file storage (ADR 0015); `null` while it has none. */
  logoUrl: string | null;
}

/** A Negocio is created with its first Sucursal and the Dueño as its Empleado (with their default Availability), and optionally its first Servicio. */
export interface CreateBusinessInput {
  business: { name: string; description: string; slug: string };
  /** Without a `slug`, the first Sucursal takes the Negocio's own: a new Negocio has no other to clash with. */
  branch: Omit<CreateBranchInput, 'slug'> & { slug?: string };
  /** No `employeeIds`: the Dueño is the only Empleado there is to put in charge. */
  service?: Omit<CreateServiceInput, 'employeeIds'>;
}

export interface UpdateBusinessInput {
  name?: string;
  description?: string;
  slug?: string;
}
