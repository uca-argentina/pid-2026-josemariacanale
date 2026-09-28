'use server';

import { getInjection } from '@/di/container';
import { revalidatePath } from 'next/cache';
import { Availability } from '@/src/entities/models/availability';
import { PutEmployeeOverride } from '@/src/entities/models/employee-override';
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

export async function putEmployeeOverrideAction(employeeId: number, date: string, override: PutEmployeeOverride) {
    const controller = getInjection('IPutEmployeeOverrideController');
    await controller({ employeeId, date, override });
    revalidatePath('/availability');
}

export async function deleteEmployeeOverrideAction(employeeId: number, date: string) {
    const controller = getInjection('IDeleteEmployeeOverrideController');
    await controller({ employeeId, date });
    revalidatePath('/availability');
}
