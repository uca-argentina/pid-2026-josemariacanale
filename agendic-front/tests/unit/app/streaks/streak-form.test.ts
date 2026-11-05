import {
    REWARD_FIELD_MESSAGES,
    burnDaysError,
    catalogServiceOptions,
    draftOfReward,
    NEW_REWARD_DRAFT,
    parseRewardDraft,
    rewardFrequencyLabel,
    rewardServiceOptions,
    rewardTermsLabel,
    rewardValidityLabel,
    shortensBurnTime,
} from '@/app/(app)/streaks/_components/streak-form';
import type { StreakReward } from '@/src/entities/models/streak-program';

const reward = (overrides: Partial<StreakReward>): StreakReward => ({
    id: 7,
    requiredCount: 5,
    repeatable: false,
    type: 'PERCENT_DISCOUNT',
    value: 10,
    description: null,
    service: null,
    validForDays: null,
    ...overrides,
});

describe('parseRewardDraft', () => {
    const draft = { ...NEW_REWARD_DRAFT, requiredCount: '5', value: '10' };

    it('turns a percentage into the Recompensa, with only the field of its type', () => {
        expect(parseRewardDraft({ ...draft, description: 'x', serviceId: '9' })).toEqual({
            fields: { requiredCount: 5, repeatable: false, type: 'PERCENT_DISCOUNT', value: 10, validForDays: null },
        });
    });

    it('takes a fixed amount with cents', () => {
        expect(parseRewardDraft({ ...draft, type: 'AMOUNT_DISCOUNT', value: '149.85' })).toMatchObject({ fields: { value: 149.85 } });
    });

    it('trims the text of a regalo', () => {
        expect(parseRewardDraft({ ...draft, type: 'GIFT', description: ' Un lavado ' })).toMatchObject({ fields: { description: 'Un lavado' } });
    });

    it('takes the Servicio gratis and the vigencia as numbers', () => {
        expect(parseRewardDraft({ ...draft, type: 'FREE_SERVICE', serviceId: '9', validForDays: '30' })).toMatchObject({
            fields: { serviceId: 9, validForDays: 30 },
        });
    });

    it.each([
        ['an empty cantidad de Turnos', { requiredCount: '' }, 'requiredCount', REWARD_FIELD_MESSAGES.requiredCount],
        ['a cantidad de Turnos with decimals', { requiredCount: '1.5' }, 'requiredCount', REWARD_FIELD_MESSAGES.requiredCount],
        ['a percentage out of range', { value: '101' }, 'value', REWARD_FIELD_MESSAGES.PERCENT_DISCOUNT],
        ['an empty percentage', { value: '' }, 'value', REWARD_FIELD_MESSAGES.PERCENT_DISCOUNT],
        ['an amount of 0', { type: 'AMOUNT_DISCOUNT' as const, value: '0' }, 'value', REWARD_FIELD_MESSAGES.AMOUNT_DISCOUNT],
        ['a regalo without text', { type: 'GIFT' as const, description: '  ' }, 'description', REWARD_FIELD_MESSAGES.GIFT],
        ['a Servicio gratis without a Servicio', { type: 'FREE_SERVICE' as const, serviceId: '' }, 'serviceId', REWARD_FIELD_MESSAGES.FREE_SERVICE],
        ['a vigencia of 0', { validForDays: '0' }, 'validForDays', REWARD_FIELD_MESSAGES.validForDays],
    ])('puts %s under its field', (_case, change, field, message) => {
        expect(parseRewardDraft({ ...draft, ...change })).toEqual({ errors: { [field]: message } });
    });
});

describe('draftOfReward', () => {
    it('fills the form with the field of its type', () => {
        expect(draftOfReward(reward({ type: 'FREE_SERVICE', value: null, service: { id: 9, name: 'Corte' }, validForDays: 30, repeatable: true }))).toEqual({
            requiredCount: '5',
            repeatable: true,
            type: 'FREE_SERVICE',
            value: '',
            description: '',
            serviceId: '9',
            validForDays: '30',
        });
    });
});

describe('rewardServiceOptions', () => {
    const services = [{ id: 1, name: 'Corte' }];

    it('lists the Servicios of the scope', () => {
        expect(rewardServiceOptions(services, null)).toEqual([{ value: '1', label: 'Corte' }]);
    });

    it('keeps the current Servicio of the Recompensa when it was dado de baja', () => {
        expect(rewardServiceOptions(services, { id: 9, name: 'Tintura' })).toEqual([
            { value: '1', label: 'Corte' },
            { value: '9', label: 'Tintura (dado de baja)' },
        ]);
    });

    it('does not repeat the current Servicio when it is still in the list', () => {
        expect(rewardServiceOptions(services, services[0])).toEqual([{ value: '1', label: 'Corte' }]);
    });
});

describe('catalogServiceOptions', () => {
    const branch = (name: string, services: { id: number; name: string }[]) => ({ name, services });
    const group = (id: number, branches: ReturnType<typeof branch>[]) => ({ business: { id }, branches });

    it('lists only the Servicios of that Negocio', () => {
        const groups = [group(1, [branch('Centro', [{ id: 10, name: 'Corte' }])]), group(2, [branch('Norte', [{ id: 20, name: 'Masaje' }])])];

        expect(catalogServiceOptions(groups, 2)).toEqual([{ id: 20, name: 'Masaje' }]);
    });

    it('names the Sucursal when the Negocio has more than one', () => {
        const groups = [group(1, [branch('Centro', [{ id: 10, name: 'Corte' }]), branch('Norte', [{ id: 20, name: 'Corte' }])])];

        expect(catalogServiceOptions(groups, 1)).toEqual([
            { id: 10, name: 'Corte · Centro' },
            { id: 20, name: 'Corte · Norte' },
        ]);
    });

    it('is empty when the Negocio is not in the catalog', () => {
        expect(catalogServiceOptions([], 1)).toEqual([]);
    });
});

describe('Tiempo de quemada', () => {
    it.each([
        ['', true],
        ['0', true],
        ['366', true],
        ['1.5', true],
        ['1', false],
        ['365', false],
    ])('checks %j', (days, invalid) => {
        expect(burnDaysError(days) !== undefined).toBe(invalid);
    });

    it.each([
        [30, '29', true],
        [30, '30', false],
        [30, '31', false],
        [30, '', false],
        [null, '1', false],
    ])('with %j saved and %j typed, warns: %j', (saved, typed, warns) => {
        expect(shortensBurnTime(saved, typed)).toBe(warns);
    });
});

describe('the labels of a Recompensa', () => {
    it.each([
        ['a percentage', reward({ value: 12.5 }), '12,5% de descuento'],
        ['an amount', reward({ type: 'AMOUNT_DISCOUNT', value: 3600 }), '$3.600 de descuento'],
        ['a regalo', reward({ type: 'GIFT', value: null, description: 'Un lavado' }), 'Un lavado'],
        ['a Servicio gratis', reward({ type: 'FREE_SERVICE', value: null, service: { id: 9, name: 'Corte' } }), 'Corte gratis'],
    ])('says what %s gives', (_case, value, label) => {
        expect(rewardTermsLabel(value)).toBe(label);
    });

    it.each([
        [5, false, 'Al llegar a 5 Turnos, una vez por Racha'],
        [1, false, 'Al llegar a 1 Turno, una vez por Racha'],
        [5, true, 'Cada 5 Turnos'],
        [1, true, 'Cada Turno'],
    ])('with %j and repeatable %j says %j', (requiredCount, repeatable, label) => {
        expect(rewardFrequencyLabel(reward({ requiredCount, repeatable }))).toBe(label);
    });

    it.each([
        [null, 'No vence'],
        [1, 'Vale 1 día'],
        [30, 'Vale 30 días'],
    ])('with a vigencia of %j says %j', (validForDays, label) => {
        expect(rewardValidityLabel(reward({ validForDays }))).toBe(label);
    });
});
