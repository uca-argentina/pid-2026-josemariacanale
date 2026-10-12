import { businessSearch, filterSearch, parseBusinessFilters, parseRange, parseServiceId, presetRange, serviceSearch } from '@/app/(app)/analytics/_components/analytics-range';

const today = '2026-10-12';

describe('presetRange', () => {
    it.each([
        ['today', { from: '2026-10-12', to: '2026-10-12' }],
        ['7d', { from: '2026-10-06', to: '2026-10-12' }],
        ['30d', { from: '2026-09-13', to: '2026-10-12' }],
        ['mtd', { from: '2026-10-01', to: '2026-10-12' }],
        ['ytd', { from: '2026-01-01', to: '2026-10-12' }],
    ] as const)('resolves %s', (preset, expected) => {
        expect(presetRange(preset, today)).toEqual(expected);
    });
});

describe('parseRange', () => {
    const parse = (search: string) => parseRange(new URLSearchParams(search), today);

    it('defaults to the last 30 days', () => {
        expect(parse('')).toEqual({ preset: '30d', from: '2026-09-13', to: today });
    });

    it('reads a preset', () => {
        expect(parse('range=7d')).toEqual({ preset: '7d', from: '2026-10-06', to: today });
    });

    it('reads a custom range', () => {
        expect(parse('from=2026-08-01&to=2026-08-31')).toEqual({ preset: 'custom', from: '2026-08-01', to: '2026-08-31' });
    });

    it.each(['range=90d', 'from=2026-08-01', 'from=2026-13-45&to=2026-10-01', 'from=2026-09-02&to=2026-09-01', 'from=2024-01-01&to=2026-01-01'])(
        'ignores the invalid URL %s',
        (search) => {
            expect(parse(search)).toEqual({ preset: '30d', from: '2026-09-13', to: today });
        },
    );
});

describe('parseServiceId', () => {
    const parse = (search: string) => parseServiceId(new URLSearchParams(search));

    it('reads a valid serviceId', () => {
        expect(parse('serviceId=7')).toBe(7);
    });

    it.each(['', 'serviceId=', 'serviceId=abc', 'serviceId=0', 'serviceId=-3', 'serviceId=1.5', 'serviceId=7x'])('ignores the invalid URL %s', (search) => {
        expect(parse(search)).toBeUndefined();
    });
});

describe('serviceSearch', () => {
    it('sets and clears serviceId keeping the rest of the URL', () => {
        expect(serviceSearch('?range=7d', 7)).toBe('?range=7d&serviceId=7');
        expect(serviceSearch('?range=7d&serviceId=7', 9)).toBe('?range=7d&serviceId=9');
        expect(serviceSearch('?range=7d&serviceId=7', undefined)).toBe('?range=7d');
        expect(serviceSearch('?serviceId=7', undefined)).toBe('');
    });
});

describe('parseBusinessFilters', () => {
    const owned = { id: 4, name: 'Spa', isOwner: true };
    const other = { id: 9, name: 'Gym', isOwner: false };
    const parse = (search: string, businesses = [owned, other]) => parseBusinessFilters(new URLSearchParams(search), businesses);

    it('has no Negocio without businessId: the analíticas are the personal ones', () => {
        expect(parse('').business).toBeUndefined();
    });

    it('picks the Negocio in the URL', () => {
        expect(parse('businessId=9').business).toEqual(other);
    });

    it.each(['businessId=77', 'businessId=abc', 'businessId=0', 'businessId=-1', 'businessId=4x'])('ignores the invalid or unlisted %s', (search) => {
        expect(parse(search).business).toBeUndefined();
    });

    it('has no Negocio when the list is empty', () => {
        expect(parse('businessId=4', []).business).toBeUndefined();
    });

    it('reads valid branchId, serviceId and employeeId', () => {
        expect(parse('businessId=4&branchId=2&serviceId=3&employeeId=5')).toMatchObject({ branchId: 2, serviceId: 3, employeeId: 5 });
    });

    it.each(['branchId=0', 'branchId=x', 'serviceId=-2', 'serviceId=1.5', 'employeeId=', 'employeeId=3a'])('ignores the invalid filter %s', (search) => {
        expect(parse(search)).toMatchObject({ branchId: undefined, serviceId: undefined, employeeId: undefined });
    });

    it('ignores employeeId when the Usuario is not the Dueño of the Negocio', () => {
        expect(parse('businessId=9&employeeId=5').employeeId).toBeUndefined();
        expect(parse('businessId=4&employeeId=5').employeeId).toBe(5);
    });
});

describe('filterSearch', () => {
    it('sets and clears a filter keeping the rest of the URL', () => {
        expect(filterSearch('?range=7d', 'branchId', 2)).toBe('?range=7d&branchId=2');
        expect(filterSearch('?branchId=2&range=7d', 'branchId', undefined)).toBe('?range=7d');
    });
});

describe('businessSearch', () => {
    it('switches the Negocio and drops the filters of the previous one', () => {
        expect(businessSearch('?range=7d&businessId=4&branchId=2&serviceId=3&employeeId=5', 9)).toBe('?range=7d&businessId=9');
    });

    it('goes back to the Usuario without businessId, keeping the range', () => {
        expect(businessSearch('?range=7d&businessId=4&branchId=2', undefined)).toBe('?range=7d');
        expect(businessSearch('?businessId=4', undefined)).toBe('');
    });
});
