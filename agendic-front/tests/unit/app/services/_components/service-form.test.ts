import { formInput, serviceFormSchema, slugFrom, type ServiceForm } from '@/app/(app)/services/_components/service-form';

const form: ServiceForm = {
    branchId: '10',
    name: ' Masaje relajante ',
    slug: 'masaje-relajante',
    slugEdited: false,
    description: '  ',
    category: 'SPA',
    duration: '60',
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

describe('serviceFormSchema', () => {
    it('convierte el formulario en el cuerpo de POST /branches/:id/services', () => {
        expect(serviceFormSchema.parse(formInput(form))).toEqual({
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
        ['durationMinutes', { duration: '0' }],
        ['durationMinutes', { duration: '' }],
        ['price', { price: '' }],
        ['price', { price: '-1' }],
    ])('marca el campo %s', (field, patch) => {
        const result = serviceFormSchema.safeParse(formInput({ ...form, ...patch }));
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].path[0]).toBe(field);
    });
});
