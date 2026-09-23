import {
    businessSchema,
    branchSchema,
    fieldErrorsOf,
    serviceSchema,
    slugify,
} from '@/app/onboarding/_components/schemas';

describe('businessSchema', () => {
    const business = { name: 'Estudio Belgrano', description: 'Kinesiología', slug: 'estudio-belgrano' };

    it('acepta un Negocio con nombre, descripción y Enlace de reserva', () => {
        expect(businessSchema.parse({ ...business, name: '  Estudio Belgrano  ' })).toEqual(
            business,
        );
    });

    it('rechaza un nombre en blanco', () => {
        const result = businessSchema.safeParse({ ...business, name: '   ' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).name).toBe('Ingresá el nombre del Negocio.');
    });

    it('acepta un Enlace de reserva en mayúsculas normalizándolo a minúsculas', () => {
        expect(businessSchema.parse({ ...business, slug: 'ESTUDIO-Belgrano' }).slug).toBe(
            'estudio-belgrano',
        );
    });

    it('rechaza un Enlace de reserva con espacios o símbolos', () => {
        const result = businessSchema.safeParse({ ...business, slug: 'estudio belgrano!' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).slug).toBe(
            'El Enlace de reserva solo puede tener minúsculas, números y guiones.',
        );
    });

    it('rechaza un Enlace de reserva de menos de 3 caracteres', () => {
        const result = businessSchema.safeParse({ ...business, slug: 'ab' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).slug).toBe(
            'El Enlace de reserva tiene que tener al menos 3 caracteres.',
        );
    });
});

describe('branchSchema', () => {
    const branch = {
        name: 'Sucursal Centro',
        address: 'Av. Cabildo 1234',
        opensAt: '09:00',
        closesAt: '18:00',
    };

    it('acepta una Sucursal que cierra después de abrir', () => {
        expect(branchSchema.parse(branch)).toEqual(branch);
    });

    it('rechaza un cierre anterior o igual a la apertura', () => {
        const result = branchSchema.safeParse({ ...branch, closesAt: '09:00' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).closesAt).toBe(
            'El cierre tiene que ser posterior a la apertura.',
        );
    });
});

describe('serviceSchema', () => {
    const service = { name: 'Consulta inicial', category: 'CLINICA', durationMinutes: '30', price: '15000' };

    it('convierte duración y precio a número', () => {
        expect(serviceSchema.parse(service)).toMatchObject({
            category: 'CLINICA',
            durationMinutes: 30,
            price: 15000,
        });
    });

    it('rechaza una duración menor a un minuto', () => {
        const result = serviceSchema.safeParse({ ...service, durationMinutes: '0' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).durationMinutes).toBe(
            'La duración tiene que ser de al menos 1 minuto.',
        );
    });

    it('rechaza un precio negativo', () => {
        const result = serviceSchema.safeParse({ ...service, price: '-1' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).price).toBe('El precio no puede ser negativo.');
    });

    it('rechaza una Categoría de Servicio que no existe', () => {
        const result = serviceSchema.safeParse({ ...service, category: 'PELUQUERIA' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).category).toBe('Elegí una Categoría de Servicio.');
    });

    it('manda la descripción vacía como ausente, no como texto vacío', () => {
        expect(serviceSchema.parse({ ...service, description: '' }).description).toBeUndefined();
        expect(serviceSchema.parse({ ...service, description: '   ' }).description).toBeUndefined();
    });

    it('conserva una descripción con contenido', () => {
        expect(serviceSchema.parse({ ...service, description: 'Incluye evaluación' }).description).toBe(
            'Incluye evaluación',
        );
    });
});

describe('slugify', () => {
    it('normaliza nombre a Enlace de reserva', () => {
        expect(slugify('Estudio Belgrano')).toBe('estudio-belgrano');
    });

    it('saca diacríticos y colapsa símbolos', () => {
        expect(slugify('Kinesiología & Más  ')).toBe('kinesiologia-mas');
    });
});
