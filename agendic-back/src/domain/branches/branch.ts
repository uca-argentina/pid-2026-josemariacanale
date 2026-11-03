import { BranchImage } from '../branch-images/branch-image';

/** Punto en el mapa de la Ubicación de una Sucursal, en grados (ADR 0037); la dirección es aparte, `Branch.address`. */
export interface MapPoint {
  /** -90 a 90. */
  lat: number;
  /** -180 a 180. */
  lng: number;
}

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
  /**
   * The Ubicación's point; its address is `address`, chosen by the Dueño and never recomputed from it. `null` only
   * on a Sucursal from before Ubicación existed that has not been geocoded or edited since.
   */
  location: MapPoint | null;
}

export interface CreateBranchInput {
  name: string;
  address: string;
  timeZone: string;
  slug: string;
  /** Opcional; sin ella, la Sucursal queda sin descripción propia (`null`). */
  description?: string | null;
  /** Obligatoria: toda Sucursal nueva nace con su punto en el mapa. */
  location: MapPoint;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  timeZone?: string;
  slug?: string;
  /** `null` removes it. */
  description?: string | null;
  /** Can be changed, never removed. */
  location?: MapPoint;
}

/** A Sucursal together with its images, ascending by order. */
export interface BranchWithImages {
  branch: Branch;
  images: BranchImage[];
}
