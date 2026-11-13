// el pedido de un cliente de entrar en la lista de espera de un servicio para una fecha
export interface WaitlistEntry {
  id: number;
  serviceId: number; 
  date: string;
  clientName: string;  
  email: string;
  link: string;
  notifiedAt: Date | null;
  leftAt: Date | null;
  createdAt: Date;
}

export interface CreateWaitlistEntryInput {
  serviceId: number;
  date: string;
  clientName: string;
  email: string;
}

export interface WaitlistEntryView {
  id: number;
  serviceId: number;
  date: string;
  timeZone: string;
  left: boolean;
  service: { name: string; slug: string };
  business: { name: string; slug: string } | null;
  branch: { name: string; slug: string } | null;
  user: { slug: string | null } | null;
}

export type AliveWaitlistEntry = WaitlistEntry &
  Pick<WaitlistEntryView, 'timeZone' | 'service' | 'business' | 'branch' | 'user'>;
