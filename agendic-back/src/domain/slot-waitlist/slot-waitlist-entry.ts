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
