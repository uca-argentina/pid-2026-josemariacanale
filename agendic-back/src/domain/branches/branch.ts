export interface Branch {
  id: number;
  businessId: number;
  name: string;
  address: string;
  timeZone: string; // IANA name, e.g. America/Argentina/Buenos_Aires
  /** Enlace de reserva's second tramo, lowercase: /business/<business slug>/<slug>. Unique within its Business only. */
  slug: string;
  /** Replaces the Negocio's description on the Sucursal's public page; `null` when it has none. */
  description: string | null;
}

export interface CreateBranchInput {
  name: string;
  address: string;
  timeZone: string;
  slug: string;
  description?: string | null;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  timeZone?: string;
  slug?: string;
  /** `null` removes it. */
  description?: string | null;
}
