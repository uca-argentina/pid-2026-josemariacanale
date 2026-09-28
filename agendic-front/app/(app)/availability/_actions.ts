'use server';

import { getInjection } from '@/di/container';
import { revalidatePath } from 'next/cache';
import { Availability } from '@/src/entities/models/availability';

export async function createAvailabilityAction(employeeId: number, data: Omit<Availability, 'id' | 'isDefault'>) {
    const controller = getInjection('ICreateAvailabilityController');
    await controller({ employeeId, data });
    revalidatePath('/availability');
}

export async function updateAvailabilityAction(id: string, data: Omit<Availability, 'id' | 'isDefault'>) {
    const controller = getInjection('IUpdateAvailabilityController');
    await controller({ id, data });
    revalidatePath('/availability');
}

export async function deleteAvailabilityAction(id: string) {
    const controller = getInjection('IDeleteAvailabilityController');
    await controller({ id });
    revalidatePath('/availability');
}

export async function setDefaultAvailabilityAction(id: string) {
    const controller = getInjection('ISetDefaultAvailabilityController');
    await controller({ id });
    revalidatePath('/availability');
}
