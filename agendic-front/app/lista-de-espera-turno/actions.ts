'use server';

// PRECARIO A PROPÓSITO: fetch directo al back, sin repositorio, sin use case, sin controller, sin DI, sin zod.
// Se refactoriza después siguiendo docs/agents/clean-architecture.md.

const API = process.env.API_URL;

async function llamar(path: string, method: 'GET' | 'POST', body?: unknown) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false as const, status: res.status, message: String(json?.message ?? `Error ${res.status}`) };
    return { ok: true as const, data: json };
}

export async function pedirCodigo(email: string) {
    return llamar('/bookings/code', 'POST', { email });
}

export async function anotarse(datos: {
    serviceId: number;
    startsAt: string;
    employeeId?: number;
    clientName: string;
    clientEmail: string;
    code: string;
}) {
    const { serviceId, ...body } = datos;
    return llamar(`/services/${serviceId}/slot-waitlist`, 'POST', body);
}

export async function verAnotacion(link: string) {
    return llamar(`/slot-waitlist-links/${encodeURIComponent(link)}`, 'GET');
}

export async function aceptarOferta(link: string) {
    return llamar(`/slot-waitlist-links/${encodeURIComponent(link)}/accept`, 'POST');
}

export async function salirDeLaLista(link: string) {
    return llamar(`/slot-waitlist-links/${encodeURIComponent(link)}/leave`, 'POST');
}
