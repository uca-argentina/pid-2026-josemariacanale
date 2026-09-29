import { IAvailabilityService } from '@/src/application/services/availability.service.interface';
import { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { Availability, availabilitySchema } from '@/src/entities/models/availability';
import { ApiRequestError, NotFoundError, ConflictError, ValidationError } from '@/src/entities/errors/common';
import { z } from 'zod';

function mapToFrontend(data: Record<string, unknown>): Availability {
    const days: Array<Array<[string, string]>> = [[], [], [], [], [], [], []];
    if (Array.isArray(data.intervals)) {
        for (const interval of data.intervals) {
            const index = interval.weekday === 0 ? 6 : interval.weekday - 1;
            days[index].push([interval.startTime as string, interval.endTime as string]);
        }
    }
    return {
        id: String(data.id),
        name: String(data.name ?? ''),
        isDefault: Boolean(data.isDefault),
        days,
        overrides: []
    };
}

function mapToBackend(data: Omit<Availability, 'id' | 'isDefault'>): Record<string, unknown> {
    const intervals: Record<string, unknown>[] = [];
    data.days.forEach((dayIntervals, i) => {
        const weekday = i === 6 ? 0 : i + 1;
        dayIntervals.forEach(([startTime, endTime]) => {
            intervals.push({ weekday, startTime, endTime });
        });
    });
    return {
        name: data.name,
        intervals
    };
}

export class AvailabilityService implements IAvailabilityService {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL
    ) {}

    private async fetchApi(path: string, options?: RequestInit) {
        const token = await this.authenticationService.getAccessToken();
        const response = await fetch(`${this.apiUrl}${path}`, {
            ...options,
            headers: {
                ...options?.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.status === 404) throw new NotFoundError('Availability not found');
        if (response.status === 409) {
            const data = await response.json();
            throw new ConflictError(data.message || 'Availability conflict');
        }
        if (response.status === 422) {
            const data = await response.json();
            throw new ValidationError(data.message || 'Availability invalid data');
        }
        if (!response.ok) throw new ApiRequestError('API request failed', { status: response.status });
        return response;
    }

    async getAvailabilities(employeeId: number): Promise<Availability[]> {
        const res = await this.fetchApi(`/employees/${employeeId}/availabilities`);
        const data = await res.json();
        const mapped = data.map(mapToFrontend);
        return z.array(availabilitySchema).parse(mapped);
    }

    async createAvailability(employeeId: number, data: Omit<Availability, 'id' | 'isDefault'>): Promise<Availability> {
        const res = await this.fetchApi(`/employees/${employeeId}/availabilities`, {
            method: 'POST',
            body: JSON.stringify(mapToBackend(data)),
        });
        return availabilitySchema.parse(mapToFrontend(await res.json()));
    }

    async updateAvailability(id: string, data: Omit<Availability, 'id' | 'isDefault'>): Promise<Availability> {
        const res = await this.fetchApi(`/availabilities/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(mapToBackend(data)),
        });
        return availabilitySchema.parse(mapToFrontend(await res.json()));
    }

    async setDefaultAvailability(id: string): Promise<Availability> {
        const res = await this.fetchApi(`/availabilities/${id}/default`, {
            method: 'POST',
        });
        return availabilitySchema.parse(mapToFrontend(await res.json()));
    }

    async deleteAvailability(id: string): Promise<void> {
        await this.fetchApi(`/availabilities/${id}`, {
            method: 'DELETE',
        });
    }
}
