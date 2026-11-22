export interface CreateSlotWaitlistEntryInput {
  clientName: string;
  email: string;
  employeeId: number | null;
  serviceId: number;
  startsAt: Date;
}
export interface SlotWaitlistEntry {
  id: number;
  serviceId: number;
  employeeId: number | null;
  startsAt: Date;
  clientName: string;
  email: string;
  link: string;
  offerBookingId: number | null;
  createdAt: Date;
  offeredAt: Date | null;
  acceptedAt: Date | null;
  leftAt: Date | null;
  expiredAt: Date | null;
}
export interface SlotWaitlistEntryView {
  id: number;
  serviceId: number;
  startsAt: string;
  timeZone: string;
  left: boolean;
  service: { name: string; slug: string };
  business: { name: string; slug: string } | null;
  branch: { name: string; slug: string } | null;
  user: { slug: string | null } | null;
}
export type AliveSlotWaitlistEntry = SlotWaitlistEntry &
  Pick<
    SlotWaitlistEntryView,
    'timeZone' | 'service' | 'business' | 'branch' | 'user'
  >;
