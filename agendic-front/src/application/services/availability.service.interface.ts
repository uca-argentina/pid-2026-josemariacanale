import { Availability } from '@/src/entities/models/availability';

export interface IAvailabilityService {
    getAvailabilities(employeeId: number): Promise<Availability[]>;
    createAvailability(employeeId: number, data: Omit<Availability, 'id' | 'isDefault'>): Promise<Availability>;
    updateAvailability(id: string, data: Omit<Availability, 'id' | 'isDefault'>): Promise<Availability>;
    setDefaultAvailability(id: string): Promise<Availability>;
    deleteAvailability(id: string): Promise<void>;
}
