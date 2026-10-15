/** Anotación: el pedido de un Cliente de entrar en la Lista de espera de un Servicio para una fecha (ADR 0034). */
export interface WaitlistEntry {
  id: number;
  serviceId: number;
  /** Fecha `YYYY-MM-DD` en la zona horaria del Servicio. */
  date: string;
  clientName: string;
  /** Recortado y en minúsculas. */
  email: string;
  /** Secreto del enlace para Salir de la Lista de espera. */
  link: string;
  /** Cuándo salió el Aviso de horario libre; nulo mientras el día siga lleno. */
  notifiedAt: Date | null;
  /** Cuándo el Cliente Salió de la Lista de espera; nulo mientras la Anotación esté viva. */
  leftAt: Date | null;
  createdAt: Date;
}

/** Lo que hace falta para crear una Anotación; el Enlace secreto lo genera el repositorio. */
export interface CreateWaitlistEntryInput {
  serviceId: number;
  date: string;
  clientName: string;
  email: string;
}

/**
 * Lo que el Cliente ve al abrir el enlace de su Anotación. Sigue la convención de `ClientBooking`: `business` y
 * `branch` son nulos en un Servicio personal, y `user` (su Enlace de reserva) en uno del Negocio.
 */
export interface WaitlistEntryView {
  id: number;
  serviceId: number;
  /** Fecha `YYYY-MM-DD` en la zona horaria del Servicio. */
  date: string;
  /** Zona horaria del Servicio. */
  timeZone: string;
  /** Si el Cliente ya Salió de la Lista de espera. */
  left: boolean;
  service: { name: string; slug: string };
  business: { name: string; slug: string } | null;
  branch: { name: string; slug: string } | null;
  user: { slug: string | null } | null;
}
