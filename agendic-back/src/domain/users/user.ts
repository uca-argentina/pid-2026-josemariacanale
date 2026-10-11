export interface User {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  /** Enlace de reserva del Usuario's tramo, lowercase, unique; null until they choose it. */
  slug: string | null;
  /** Foto de perfil: Clerk's, seeded on creation only; null without a real photo, never refreshed after. */
  imageUrl: string | null;
  createdAt: Date;
  /** When the Usuario was dado de baja (ADR 0024); null while active. */
  deletedAt: Date | null;
  /** Preferencia de hora, 12 o 24 h; solo para el panel, nunca para la página de reserva. */
  timeFormat: 12 | 24;
  /** Primer día de la semana en el panel, 0 = domingo como `dayjs().day()`. */
  weekStart: number;
}

export interface UpdateMeInput {
  name?: string;
  slug?: string;
  timeFormat?: 12 | 24;
  weekStart?: number;
}
