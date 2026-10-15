import {
    copySlug,
    editFormOf,
    personalServiceFormSchema,
    serviceChanges,
    serviceFormSchema,
    slugFrom,
    slugWhileTyping,
    type ServiceForm,
} from '@/app/(app)/services/_components/service-form';

const form: ServiceForm = {
    branchId: '10',
    availabilityId: '',
    name: ' Masaje relajante ',
    slug: 'masaje-relajante',
    slugEdited: false,
    description: '  ',
    category: 'SPA',
    durationMinutes: '60',
    price: '20000',
};

describe('slugFrom', () => {
    it('propone el tramo desde el nombre, sin tildes ni símbolos', () => {
        expect(slugFrom('Consulta inicial de kinesiología')).toBe('consulta-inicial-de-kinesiologia');
    });

    it('corta a 40 caracteres sin dejar un guion al final', () => {
        expect(slugFrom(`${'a'.repeat(39)} b`)).toBe('a'.repeat(39));
    });
});

describe('slugWhileTyping', () => {
    it('deja escribir el guion antes de la próxima palabra', () => {
        expect(slugWhileTyping('corte-')).toBe('corte-');
        expect(slugWhileTyping('Corte de Pelo')).toBe('corte-de-pelo');
    });

    it('saca tildes y símbolos', () => {
        expect(slugWhileTyping('Kinesiología!')).toBe('kinesiologia');
    });
});

describe('copySlug', () => {
    it('suma "-copia" al tramo', () => {
        expect(copySlug('masaje')).toBe('masaje-copia');
    });

    it('recorta un tramo largo antes de sumar "-copia", así la copia nunca repite el tramo', () => {
        const long = `${'a'.repeat(33)}-bcdef`;
        expect(copySlug(long)).toBe(`${'a'.repeat(33)}-copia`);
        expect(copySlug(long)).toHaveLength(39);
    });
});

describe('serviceFormSchema', () => {
    it('convierte el formulario en el cuerpo de POST /branches/:id/services', () => {
        expect(serviceFormSchema.parse(form)).toEqual({
            branchId: 10,
            name: 'Masaje relajante',
            slug: 'masaje-relajante',
            description: undefined,
            category: 'SPA',
            durationMinutes: 60,
            price: 20000,
        });
    });

    it.each([
        ['branchId', { branchId: '' }],
        ['slug', { slug: 'ma' }],
        ['slug', { slug: 'masaje--vip' }],
        ['category', { category: '' as const }],
        ['durationMinutes', { durationMinutes: '0' }],
        ['durationMinutes', { durationMinutes: '' }],
        ['price', { price: '' }],
        ['price', { price: '-1' }],
    ])('marca el campo %s', (field, patch) => {
        const result = serviceFormSchema.safeParse({ ...form, ...patch });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].path[0]).toBe(field);
    });
});

describe('personalServiceFormSchema', () => {
    const personal = { ...form, branchId: '', availabilityId: '7' };

    it('convierte el formulario en el cuerpo de POST /users/me/services, sin Sucursal', () => {
        expect(personalServiceFormSchema.parse(personal)).toEqual({
            availabilityId: 7,
            name: 'Masaje relajante',
            slug: 'masaje-relajante',
            description: undefined,
            category: 'SPA',
            durationMinutes: 60,
            price: 20000,
        });
    });

    it('marca las Horas laborables si no se eligieron', () => {
        const result = personalServiceFormSchema.safeParse({ ...personal, availabilityId: '' });
        expect(result.error?.issues[0].path[0]).toBe('availabilityId');
    });
});

const service = {
    name: 'Masaje',
    slug: 'masaje',
    description: 'Relajante',
    category: 'SPA' as const,
    durationMinutes: 60,
    price: 20000,
    depositPercent: null,
    requiresApproval: false,
    prepMinutes: 0,
    dailyLimit: null,
    slotInterval: null,
    minimumNoticeMinutes: 0,
    repeatEveryWeeks: null,
    repeatMaxBookings: null,
};

describe('editFormOf', () => {
    it('pasa el Servicio a texto de los inputs, con la Seña apagada si no tiene', () => {
        expect(editFormOf(service)).toEqual({
            name: 'Masaje',
            slug: 'masaje',
            description: 'Relajante',
            category: 'SPA',
            durationMinutes: '60',
            price: '20000',
            depositEnabled: false,
            depositPercent: '',
            requiresApproval: false,
            prepMinutes: '0',
            dailyLimitEnabled: false,
            dailyLimit: '',
            slotInterval: '',
            minimumNoticeMinutes: '0',
            repeatEnabled: false,
            repeatEveryWeeks: '1',
            repeatMaxBookings: '4',
        });
    });

    it('prende la Repetición con cada cuántas semanas y hasta cuántos Turnos', () => {
        expect(editFormOf({ ...service, repeatEveryWeeks: 2, repeatMaxBookings: 6 })).toMatchObject({
            repeatEnabled: true,
            repeatEveryWeeks: '2',
            repeatMaxBookings: '6',
        });
    });

    it('prende el Límite diario con su máximo', () => {
        expect(editFormOf({ ...service, prepMinutes: 10, dailyLimit: 8 })).toMatchObject({
            prepMinutes: '10',
            dailyLimitEnabled: true,
            dailyLimit: '8',
        });
    });

    it('prende la Seña con su porcentaje y deja vacía una descripción nula', () => {
        expect(editFormOf({ ...service, description: null, depositPercent: 20 })).toMatchObject({
            description: '',
            depositEnabled: true,
            depositPercent: '20',
        });
    });
});

describe('serviceChanges', () => {
    const saved = editFormOf(service);

    it('no manda nada si nada cambió', () => {
        expect(serviceChanges(saved, { ...saved, name: ' Masaje ' })).toEqual({ ok: true, changes: {} });
    });

    it('manda solo los campos que cambiaron, ya convertidos', () => {
        expect(
            serviceChanges(saved, { ...saved, price: '25000', slug: 'masaje-relax', requiresApproval: true }),
        ).toEqual({ ok: true, changes: { price: 25000, slug: 'masaje-relax', requiresApproval: true } });
    });

    it('activa la Seña con su porcentaje', () => {
        expect(serviceChanges(saved, { ...saved, depositEnabled: true, depositPercent: '30' })).toEqual({
            ok: true,
            changes: { depositPercent: 30 },
        });
    });

    it('saca la Seña mandando null', () => {
        const withDeposit = editFormOf({ ...service, depositPercent: 20 });
        expect(serviceChanges(withDeposit, { ...withDeposit, depositEnabled: false })).toEqual({
            ok: true,
            changes: { depositPercent: null },
        });
    });

    it('ignora el porcentaje escrito si la Seña sigue apagada', () => {
        expect(serviceChanges(saved, { ...saved, depositPercent: '30' })).toEqual({ ok: true, changes: {} });
    });

    it.each(['', '0', '101', '12.5', 'diez'])('rechaza una Seña de "%s"', (depositPercent) => {
        const result = serviceChanges(saved, { ...saved, depositEnabled: true, depositPercent });
        expect(result).toEqual({ ok: false, errors: { depositPercent: 'La Seña va de 1 a 100%, en enteros.' } });
    });

    it('manda el Tiempo de preparación como número', () => {
        expect(serviceChanges(saved, { ...saved, prepMinutes: '30' })).toEqual({ ok: true, changes: { prepMinutes: 30 } });
    });

    it('activa el Límite diario con su máximo', () => {
        expect(serviceChanges(saved, { ...saved, dailyLimitEnabled: true, dailyLimit: '6' })).toEqual({
            ok: true,
            changes: { dailyLimit: 6 },
        });
    });

    it('activa la Repetición mandando los dos campos juntos', () => {
        expect(serviceChanges(saved, { ...saved, repeatEnabled: true, repeatEveryWeeks: '2', repeatMaxBookings: '5' })).toEqual({
            ok: true,
            changes: { repeatEveryWeeks: 2, repeatMaxBookings: 5 },
        });
    });

    it('edita la Repetición mandando los dos campos, aunque cambie uno solo', () => {
        const repeating = editFormOf({ ...service, repeatEveryWeeks: 1, repeatMaxBookings: 4 });
        expect(serviceChanges(repeating, { ...repeating, repeatMaxBookings: '8' })).toEqual({
            ok: true,
            changes: { repeatEveryWeeks: 1, repeatMaxBookings: 8 },
        });
    });

    it('saca la Repetición mandando los dos campos en null', () => {
        const repeating = editFormOf({ ...service, repeatEveryWeeks: 1, repeatMaxBookings: 4 });
        expect(serviceChanges(repeating, { ...repeating, repeatEnabled: false })).toEqual({
            ok: true,
            changes: { repeatEveryWeeks: null, repeatMaxBookings: null },
        });
    });

    it.each([
        ['más de 10 Turnos', { repeatMaxBookings: '11' }, 'repeatMaxBookings'],
        ['menos de 2 Turnos', { repeatMaxBookings: '1' }, 'repeatMaxBookings'],
        ['Turnos sin número', { repeatMaxBookings: '' }, 'repeatMaxBookings'],
        ['cada 0 semanas', { repeatEveryWeeks: '0' }, 'repeatEveryWeeks'],
        ['semanas con decimales', { repeatEveryWeeks: '1.5' }, 'repeatEveryWeeks'],
    ])('no deja guardar una Repetición con %s', (_case, patch, field) => {
        const result = serviceChanges(saved, { ...saved, repeatEnabled: true, ...patch });
        expect(result.ok).toBe(false);
        expect(result.ok === false && result.errors[field]).toBeTruthy();
    });

    it('ignora la Repetición escrita si sigue apagada', () => {
        expect(serviceChanges(saved, { ...saved, repeatMaxBookings: '20' })).toEqual({ ok: true, changes: {} });
    });

    it('saca el Límite diario mandando null', () => {
        const limited = editFormOf({ ...service, dailyLimit: 6 });
        expect(serviceChanges(limited, { ...limited, dailyLimitEnabled: false })).toEqual({
            ok: true,
            changes: { dailyLimit: null },
        });
    });

    it('manda el Intervalo y la Anticipación mínima, y el Intervalo vacío vuelve a null', () => {
        const withInterval = editFormOf({ ...service, slotInterval: 30 });
        expect(serviceChanges(saved, { ...saved, slotInterval: '30', minimumNoticeMinutes: '120' })).toEqual({
            ok: true,
            changes: { slotInterval: 30, minimumNoticeMinutes: 120 },
        });
        expect(serviceChanges(withInterval, { ...withInterval, slotInterval: '' })).toEqual({
            ok: true,
            changes: { slotInterval: null },
        });
    });

    it.each(['0', '-5', '1.5', 'x'])('rechaza un Intervalo de "%s"', (slotInterval) => {
        expect(serviceChanges(saved, { ...saved, slotInterval })).toMatchObject({ ok: false, errors: { slotInterval: expect.any(String) } });
    });

    it.each(['-1', '2.5', 'x'])('rechaza una Anticipación mínima de "%s"', (minimumNoticeMinutes) => {
        expect(serviceChanges(saved, { ...saved, minimumNoticeMinutes })).toMatchObject({ ok: false, errors: { minimumNoticeMinutes: expect.any(String) } });
    });

    it.each(['', '0', '-2', '1.5', 'diez'])('rechaza un Límite diario de "%s"', (dailyLimit) => {
        const result = serviceChanges(saved, { ...saved, dailyLimitEnabled: true, dailyLimit });
        expect(result).toEqual({ ok: false, errors: { dailyLimit: 'El Límite diario es de al menos 1 Turno, en enteros.' } });
    });

    describe('campo vacío del NumberField', () => {
        it('Intervalo vacío es sin Intervalo', () => {
            const withInterval = editFormOf({ ...service, slotInterval: 30 });
            expect(serviceChanges(withInterval, { ...withInterval, slotInterval: '' })).toEqual({
                ok: true,
                changes: { slotInterval: null },
            });
        });

        it('Anticipación mínima vacía es 0', () => {
            const withNotice = editFormOf({ ...service, minimumNoticeMinutes: 60 });
            expect(serviceChanges(withNotice, { ...withNotice, minimumNoticeMinutes: '' })).toEqual({
                ok: true,
                changes: { minimumNoticeMinutes: 0 },
            });
        });

        it('Límite diario vacío, con el límite apagado, es sin Límite diario', () => {
            const limited = editFormOf({ ...service, dailyLimit: 6 });
            expect(serviceChanges(limited, { ...limited, dailyLimitEnabled: false, dailyLimit: '' })).toEqual({
                ok: true,
                changes: { dailyLimit: null },
            });
        });

        it.each(['durationMinutes', 'price'] as const)('%s vacío da error de validación', (field) => {
            expect(serviceChanges(saved, { ...saved, [field]: '' })).toMatchObject({
                ok: false,
                errors: { [field]: expect.any(String) },
            });
        });
    });

    it('no deja borrar una descripción que ya tenía, porque el back no la vacía', () => {
        expect(serviceChanges(saved, { ...saved, description: '  ' })).toEqual({
            ok: false,
            errors: { description: 'La descripción no se puede borrar: escribí una nueva.' },
        });
    });

    it('acepta dejar vacía una descripción que ya estaba vacía', () => {
        const blank = editFormOf({ ...service, description: null });
        expect(serviceChanges(blank, { ...blank, name: 'Masaje relax' })).toEqual({
            ok: true,
            changes: { name: 'Masaje relax' },
        });
    });

    it('devuelve el error de cada campo inválido', () => {
        const result = serviceChanges(saved, { ...saved, name: ' ', slug: 'ma', durationMinutes: '0', price: '-1' });
        expect(result.ok).toBe(false);
        expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['durationMinutes', 'name', 'price', 'slug']);
    });
});
