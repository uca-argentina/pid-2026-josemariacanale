import { parseBookingsUrl, writeBookingsUrl, type BookingsUrlState } from '@/app/(app)/bookings/_components/bookings-url';

const parse = (search: string) => parseBookingsUrl(new URLSearchParams(search));

describe('parseBookingsUrl / writeBookingsUrl', () => {
    it.each<BookingsUrlState>([
        { tab: 'upcoming', filters: [], range: null, view: 'list', week: null },
        { tab: 'past', filters: [], range: { from: '2026-09-01', to: '2026-09-30' }, view: 'calendar', week: '2026-10-12' },
        {
            tab: 'cancelled',
            filters: [
                { field: 'service', values: ['Masaje', 'Yoga & Pilates'] },
                { field: 'branch', values: ['Spa · Centro'] },
                { field: 'clientName', op: 'contains', value: 'Lucía' },
                { field: 'clientEmail', op: 'is', value: 'lucia@gmail.com' },
            ],
            range: null,
            view: 'list',
            week: null,
        },
    ])('round-trips %j', (state) => {
        expect(parseBookingsUrl(writeBookingsUrl(state))).toEqual(state);
    });

    it('sin parámetros cae en los valores por defecto', () => {
        expect(parse('')).toEqual({ tab: 'upcoming', filters: [], range: null, view: 'list', week: null });
    });

    it('una pestaña inválida cae en Próximos', () => {
        expect(parse('tab=nada').tab).toBe('upcoming');
    });

    it('un rango con fechas inválidas, incompletas o al revés se ignora', () => {
        expect(parse('desde=2026-13-45&hasta=2026-09-10').range).toBeNull();
        expect(parse('desde=2026-09-10').range).toBeNull();
        expect(parse('desde=2026-09-10&hasta=2026-09-01').range).toBeNull();
        expect(parse('desde=ayer&hasta=hoy').range).toBeNull();
    });

    it('un operador inválido cae en "es" y un filtro vacío se ignora', () => {
        expect(parse('clientName=Ana&clientNameOp=raro').filters).toEqual([{ field: 'clientName', op: 'is', value: 'Ana' }]);
        expect(parse('clientName=&service=').filters).toEqual([]);
    });

    it('al escribir conserva los parámetros ajenos y omite los valores por defecto', () => {
        const params = writeBookingsUrl({ tab: 'upcoming', filters: [], range: null, view: 'list', week: null }, new URLSearchParams('otro=1&tab=past&view=calendar&week=2026-10-12&desde=2026-09-01&hasta=2026-09-02'));
        expect(params.toString()).toBe('otro=1');
    });

    it('un filtro sin valor no se escribe', () => {
        const params = writeBookingsUrl({ tab: 'pending', filters: [{ field: 'service', values: [] }, { field: 'clientName', op: 'is', value: '' }], range: null, view: 'list', week: null });
        expect(params.toString()).toBe('tab=pending');
    });

    it('una vista inválida cae en la lista y una semana inválida se ignora', () => {
        expect(parse('view=raro').view).toBe('list');
        expect(parse('view=calendar&week=2026-13-45')).toMatchObject({ view: 'calendar', week: null });
    });

    it('la semana solo se escribe en el calendario', () => {
        expect(writeBookingsUrl({ tab: 'upcoming', filters: [], range: null, view: 'calendar', week: '2026-10-12' }).toString()).toBe('view=calendar&week=2026-10-12');
        expect(writeBookingsUrl({ tab: 'upcoming', filters: [], range: null, view: 'list', week: '2026-10-12' }).toString()).toBe('');
    });
});
