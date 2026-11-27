'use server';

import { back } from '@/app/_components/back';

export async function registrarLlegada(id: number) {
    return back('PATCH', `/agenda/${id}/llegada`, { auth: true });
}

export async function marcarAusencia(id: number) {
    return back('PATCH', `/bookings/${id}/no-show`, { auth: true });
}

export async function cancelarTurno(id: number) {
    return back('PATCH', `/bookings/${id}/cancel`, { body: {}, auth: true });
}
