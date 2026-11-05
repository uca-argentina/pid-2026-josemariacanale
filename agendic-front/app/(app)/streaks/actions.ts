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
export type StreakActionResult<Field extends string = never> = { ok: true } | { ok: false; message: string; field?: Field };

/** Qué responder cuando falla: `invalid` es el 400 y `notFound`, qué es lo que ya no existe en un 404. */
type FailureMessages<Field extends string> = {
    fallback: string;
    notFound: string;
    invalid?: (error: InputParseError) => { field: Field; message: string };
};

/**
 * Corre un controller, traduce sus errores a lo que muestra la página y refresca si salió bien. El formulario ya valida
 * con las mismas reglas, así que un 400 llega solo si el back las endureció.
 */
async function run<Field extends string = never>(
    { fallback, notFound, invalid }: FailureMessages<Field>,
    work: () => Promise<unknown>,
    freeService?: Field,
): Promise<StreakActionResult<Field>> {
    try {
        await work();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof FreeServiceNotAllowedError && freeService) return { ok: false, field: freeService, message: 'Ese Servicio ya no se puede regalar: elegí otro.' };
        if (error instanceof UnauthorizedError) return { ok: false, message: 'Solo el Dueño puede cambiar las Rachas del Negocio.' };
        if (error instanceof NotFoundError) {
            // Gone from another tab: what is on screen is out of date.
            refresh();
            return { ok: false, message: notFound };
        }
        if (error instanceof InputParseError && invalid) return { ok: false, ...invalid(error) };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: fallback };
    }
}

const BUSINESS_GONE = 'Ese Negocio ya no existe.';
const REWARD_GONE = 'Esa Recompensa ya no existe.';

// The back's validation names the field it rejects first; anything else is about the field the type asks for.
const invalidReward =
    ({ type }: StreakRewardFields) =>
    ({ message }: InputParseError): { field: RewardField; message: string } => {
        const common = /^(requiredCount|validForDays)\b/.exec(message)?.[1] as 'requiredCount' | 'validForDays' | undefined;
        return common ? { field: common, message: REWARD_FIELD_MESSAGES[common] } : { field: REWARD_TERM_FIELD[type], message: REWARD_FIELD_MESSAGES[type] };
    };

/** Guarda el interruptor y el Tiempo de quemada de las Rachas del alcance. */
export async function saveStreakProgramAction(input: SaveStreakProgram): Promise<StreakActionResult<'burnAfterDays'>> {
    return run(
        {
            fallback: 'No pudimos guardar las Rachas. Intentá de nuevo.',
            notFound: BUSINESS_GONE,
            invalid: () => ({ field: 'burnAfterDays', message: BURN_DAYS_MESSAGE }),
        },
        () => getInjection('ISaveStreakProgramController')(input),
    );
}

/** Crea una Recompensa en el Negocio `businessId` o, sin él, en los Servicios personales. */
export async function createStreakRewardAction(businessId: number | undefined, fields: StreakRewardFields): Promise<StreakActionResult<RewardField>> {
    return run<RewardField>(
        { fallback: 'No pudimos crear la Recompensa. Intentá de nuevo.', notFound: BUSINESS_GONE, invalid: invalidReward(fields) },
        () => getInjection('ICreateStreakRewardController')({ ...fields, businessId }),
        'serviceId',
    );
}

/** Edita una Recompensa. */
export async function updateStreakRewardAction(id: number, fields: StreakRewardFields): Promise<StreakActionResult<RewardField>> {
    return run<RewardField>(
        { fallback: 'No pudimos guardar la Recompensa. Intentá de nuevo.', notFound: REWARD_GONE, invalid: invalidReward(fields) },
        () => getInjection('IUpdateStreakRewardController')({ ...fields, id }),
        'serviceId',
    );
}

/** Borra una Recompensa. */
export async function deleteStreakRewardAction(id: number): Promise<StreakActionResult> {
    return run({ fallback: 'No pudimos borrar la Recompensa. Intentá de nuevo.', notFound: REWARD_GONE }, () =>
        getInjection('IDeleteStreakRewardController')({ id }),
    );
}
