import type { ServiceSlots } from '@/src/entities/models/slot';

export interface ISlotsRepository {
    getSlots(serviceId: number, employeeId: number, from: string, to: string): Promise<ServiceSlots>;
}
