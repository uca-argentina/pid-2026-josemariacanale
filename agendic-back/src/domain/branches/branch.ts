export interface Branch {
  id: number;
  businessId: number;
  name: string;
  address: string;
  timeZone: string; // IANA name, e.g. America/Argentina/Buenos_Aires
  /** Enlace de reserva's second tramo, lowercase: /business/<business slug>/<slug>. Unique within its Business only. */
  slug: string;
}

export interface CreateBranchInput {
  name: string;
  address: string;
  timeZone: string;
  slug: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  timeZone?: string;
  slug?: string;
}
