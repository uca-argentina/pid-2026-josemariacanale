"use server";
import { updateMockService } from "../../_components/mock-services";

export async function saveServiceAction(serviceId: string, updates: any) {
    updateMockService(serviceId, updates);
}
