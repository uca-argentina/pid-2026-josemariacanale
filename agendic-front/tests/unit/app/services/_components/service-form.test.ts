import { copySlug, serviceFormSchema, slugFrom, slugWhileTyping, type ServiceForm } from '@/app/(app)/services/_components/service-form';

const form: ServiceForm = {
    branchId: '10',
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
