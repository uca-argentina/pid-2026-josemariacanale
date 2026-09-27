import type { Booking, CreateBooking } from '@/src/entities/models/booking';
import type { ServiceSlots } from '@/src/entities/models/slot';

export interface IBookingsRepository {
    // Throws SlotConflictError (409) if the slot is taken; ApiRequestError on other failures.
    createBooking(input: CreateBooking): Promise<Booking>;
    getServiceSlots(serviceId: number, employeeId: number, from: string, to: string): Promise<ServiceSlots>;
    payDeposit(bookingId: number): Promise<Booking>;
    updateStatus(bookingId: number, status: string): Promise<Booking>;
}
