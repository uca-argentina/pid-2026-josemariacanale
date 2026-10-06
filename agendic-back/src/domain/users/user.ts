export interface User {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  /** Enlace de reserva del Usuario's tramo, lowercase, unique; null until they choose it. */
  slug: string | null;
  createdAt: Date;
}

export interface UpdateMeInput {
  name?: string;
  slug?: string;
}
