import { formatPrice } from '@/app/_components/booking/format';
import {
    BURN_AFTER_DAYS_MAX,
    BURN_AFTER_DAYS_MIN,
    GIFT_DESCRIPTION_MAX,
    saveStreakProgramSchema,
    streakRewardFieldsSchema,
    type StreakReward,
    type StreakRewardFields,
    type StreakRewardType,
} from '@/src/entities/models/streak-program';

/** Por qué no vale el Tiempo de quemada. */
export const BURN_DAYS_MESSAGE = `Ingresá una cantidad de días entre ${BURN_AFTER_DAYS_MIN} y ${BURN_AFTER_DAYS_MAX}.`;

/** Lo que el diálogo de la Recompensa edita, como lo tienen los campos: el texto tal cual, hasta guardar. */
export type RewardDraft = {
    requiredCount: string;
    repeatable: boolean;
    type: StreakRewardType;
    value: string;
    description: string;
    serviceId: string;
    validForDays: string;
};

/** Un campo del diálogo que puede mostrar un error. */
export type RewardField = 'requiredCount' | 'value' | 'description' | 'serviceId' | 'validForDays';

/** El campo que pide cada tipo de Recompensa. */
export const REWARD_TERM_FIELD: Record<StreakRewardType, RewardField> = {
    PERCENT_DISCOUNT: 'value',
    AMOUNT_DISCOUNT: 'value',
    GIFT: 'description',
    FREE_SERVICE: 'serviceId',
};

/** Qué va bajo cada campo: los de cantidad y vigencia, y el que pide cada tipo. */
export const REWARD_FIELD_MESSAGES = {
    requiredCount: 'Ingresá una cantidad de Turnos, sin decimales, mayor que 0.',
    validForDays: 'Ingresá una cantidad de días, sin decimales, mayor que 0, o dejala vacía para que no venza.',
    PERCENT_DISCOUNT: 'Ingresá un porcentaje entre 1 y 100, con hasta dos decimales.',
    AMOUNT_DISCOUNT: 'Ingresá un monto mayor que 0, con hasta dos decimales.',
    GIFT: `Contá cuál es el regalo, en hasta ${GIFT_DESCRIPTION_MAX} caracteres.`,
    FREE_SERVICE: 'Elegí un Servicio.',
} as const;

/** El diálogo de una Recompensa nueva. */
export const NEW_REWARD_DRAFT: RewardDraft = {
    requiredCount: '',
    repeatable: false,
    type: 'PERCENT_DISCOUNT',
    value: '',
    description: '',
    serviceId: '',
    validForDays: '',
};

/** El diálogo con una Recompensa ya guardada. */
export const draftOfReward = ({ requiredCount, repeatable, type, value, description, service, validForDays }: StreakReward): RewardDraft => ({
    requiredCount: String(requiredCount),
    repeatable,
    type,
    value: value === null ? '' : String(value),
    description: description ?? '',
    serviceId: service ? String(service.id) : '',
    validForDays: validForDays === null ? '' : String(validForDays),
});

/** Valida el diálogo con las mismas reglas que el controller: devuelve la Recompensa, o el mensaje de cada campo que no vale. */
export function parseRewardDraft(draft: RewardDraft): { fields: StreakRewardFields } | { errors: Partial<Record<RewardField, string>> } {
    const { success, data, error } = streakRewardFieldsSchema.safeParse({
        requiredCount: Number(draft.requiredCount),
        repeatable: draft.repeatable,
        type: draft.type,
        validForDays: draft.validForDays === '' ? null : Number(draft.validForDays),
        // Only the field the type asks for: `Number('')` is 0, which each rule rejects.
        ...(REWARD_TERM_FIELD[draft.type] === 'value' && { value: Number(draft.value) }),
        ...(REWARD_TERM_FIELD[draft.type] === 'description' && { description: draft.description }),
        ...(REWARD_TERM_FIELD[draft.type] === 'serviceId' && { serviceId: Number(draft.serviceId) }),
    });
    if (success) return { fields: data };
    const errors: Partial<Record<RewardField, string>> = {};
    for (const issue of error.issues) {
        const field = issue.path[0] as RewardField;
        errors[field] = field === 'requiredCount' || field === 'validForDays' ? REWARD_FIELD_MESSAGES[field] : REWARD_FIELD_MESSAGES[draft.type];
    }
    return { errors };
}

/** El mensaje del Tiempo de quemada que no vale; `undefined` si vale. */
export const burnDaysError = (days: string) =>
    saveStreakProgramSchema.shape.burnAfterDays.safeParse(days === '' ? NaN : Number(days)).success ? undefined : BURN_DAYS_MESSAGE;

/** Si lo que se tipeó acorta el Tiempo de quemada guardado, que puede quemar Rachas en curso. */
export const shortensBurnTime = (saved: number | null, typed: string) => saved !== null && typed !== '' && Number(typed) < saved;

/** Un Servicio que se puede elegir como Servicio gratis. */
export type RewardServiceOption = { id: number; name: string };

/** Los Servicios de un Negocio en el catálogo del panel; con más de una Sucursal, cada uno dice la suya. */
export function catalogServiceOptions(
    groups: { business: { id: number }; branches: { name: string; services: RewardServiceOption[] }[] }[],
    businessId: number,
): RewardServiceOption[] {
    const branches = groups.find(({ business }) => business.id === businessId)?.branches ?? [];
    return branches.flatMap(({ name: branch, services }) =>
        services.map(({ id, name }) => ({ id, name: branches.length > 1 ? `${name} · ${branch}` : name })),
    );
}

/**
 * Las opciones del selector de Servicio gratis. El Servicio que la Recompensa ya tiene se suma si no está en la lista:
 * se dio de baja después, y el back deja seguir editando la Recompensa con él.
 */
export function rewardServiceOptions(services: RewardServiceOption[], current: StreakReward['service']) {
    const options = services.map(({ id, name }) => ({ value: String(id), label: name }));
    if (!current || services.some(({ id }) => id === current.id)) return options;
    return [...options, { value: String(current.id), label: `${current.name} (dado de baja)` }];
}

const turnos = (count: number) => (count === 1 ? '1 Turno' : `${count} Turnos`);

/** Qué da la Recompensa. */
export function rewardTermsLabel({ type, value, description, service }: StreakReward) {
    switch (type) {
        case 'PERCENT_DISCOUNT':
            return `${(value ?? 0).toLocaleString('es-AR')}% de descuento`;
        case 'AMOUNT_DISCOUNT':
            return `${formatPrice(value ?? 0)} de descuento`;
        case 'GIFT':
            return description ?? '';
        case 'FREE_SERVICE':
            return `${service?.name ?? 'Servicio'} gratis`;
    }
}

/** Cuándo se gana la Recompensa. */
export const rewardFrequencyLabel = ({ requiredCount, repeatable }: Pick<StreakReward, 'requiredCount' | 'repeatable'>) =>
    repeatable
        ? requiredCount === 1
            ? 'Cada Turno'
            : `Cada ${requiredCount} Turnos`
        : `Al llegar a ${turnos(requiredCount)}, una vez por Racha`;

/** Cuánto vale el Premio que da la Recompensa. */
export const rewardValidityLabel = ({ validForDays }: Pick<StreakReward, 'validForDays'>) =>
    validForDays === null ? 'No vence' : `Vale ${validForDays} ${validForDays === 1 ? 'día' : 'días'}`;
