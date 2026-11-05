'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { FreeServiceNotAllowedError } from '@/src/entities/errors/streak';
import type { SaveStreakProgram, StreakRewardFields } from '@/src/entities/models/streak-program';
import { BURN_DAYS_MESSAGE, REWARD_FIELD_MESSAGES, REWARD_TERM_FIELD, type RewardField } from './_components/streak-form';

/** `message` se muestra al Usuario; `field` lo pone bajo ese campo en vez de en un toast. */
export type StreakActionResult = { ok: true } | { ok: false; message: string; field?: RewardField | 'burnAfterDays' };

/**
 * Corre un controller, traduce sus errores a lo que muestra la página y refresca si salió bien. `invalid` es a qué
 * campo va un 400: el formulario ya valida con las mismas reglas, así que llega solo si el back las endureció.
 */
async function run(fallback: string, invalid: Extract<StreakActionResult, { ok: false }> | null, work: () => Promise<unknown>): Promise<StreakActionResult> {
    try {
        await work();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof FreeServiceNotAllowedError) return { ok: false, field: 'serviceId', message: 'Ese Servicio ya no se puede regalar: elegí otro.' };
        if (error instanceof UnauthorizedError) return { ok: false, message: 'Solo el Dueño puede cambiar las Rachas del Negocio.' };
        if (error instanceof NotFoundError) {
            // Deleted from another tab: the list on screen is what is out of date.
            refresh();
            return { ok: false, message: 'Esa Recompensa ya no existe.' };
        }
        if (error instanceof InputParseError && invalid) return invalid;
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: fallback };
    }
}

const invalidReward = ({ type }: StreakRewardFields) => ({ ok: false as const, field: REWARD_TERM_FIELD[type], message: REWARD_FIELD_MESSAGES[type] });

/** Guarda el interruptor y el Tiempo de quemada de las Rachas del alcance. */
export async function saveStreakProgramAction(input: SaveStreakProgram): Promise<StreakActionResult> {
    return run('No pudimos guardar las Rachas. Intentá de nuevo.', { ok: false, field: 'burnAfterDays', message: BURN_DAYS_MESSAGE }, () =>
        getInjection('ISaveStreakProgramController')(input),
    );
}

/** Crea una Recompensa en el Negocio `businessId` o, sin él, en los Servicios personales. */
export async function createStreakRewardAction(businessId: number | undefined, fields: StreakRewardFields): Promise<StreakActionResult> {
    return run('No pudimos crear la Recompensa. Intentá de nuevo.', invalidReward(fields), () =>
        getInjection('ICreateStreakRewardController')({ ...fields, ...(businessId !== undefined && { businessId }) }),
    );
}

/** Edita una Recompensa. */
export async function updateStreakRewardAction(id: number, fields: StreakRewardFields): Promise<StreakActionResult> {
    return run('No pudimos guardar la Recompensa. Intentá de nuevo.', invalidReward(fields), () =>
        getInjection('IUpdateStreakRewardController')({ ...fields, id }),
    );
}

/** Borra una Recompensa. */
export async function deleteStreakRewardAction(id: number): Promise<StreakActionResult> {
    return run('No pudimos borrar la Recompensa. Intentá de nuevo.', null, () => getInjection('IDeleteStreakRewardController')({ id }));
}
