'use server';

import { back } from '@/app/_components/back';

export async function responderReclamo(id: number, response: string) {
    return back('PUT', `/claims/${id}`, { body: { response }, auth: true });
}
