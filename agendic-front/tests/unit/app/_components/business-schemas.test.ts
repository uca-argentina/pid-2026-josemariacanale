import {
    businessSchema,
    branchSchema,
    inviteEmployeeSchema,
    fieldErrorsOf,
    slugify,
    type CreateBusinessPayload,
} from '@/app/_components/business-schemas';

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
        timeZone: 'America/Argentina/Buenos_Aires',
    };

    it('no pide Servicio: la Sucursal y el Negocio alcanzan para Crear Negocio', () => {
        const payload: CreateBusinessPayload = {
            business: businessSchema.parse({ name: 'Estudio', description: 'Desc', slug: 'estudio' }),
            branch: branchSchema.parse(branch),
        };

        expect(Object.keys(payload)).toEqual(['business', 'branch']);
    });

    it('acepta una Sucursal con nombre, dirección y zona horaria, y deriva su tramo del nombre', () => {
        expect(branchSchema.parse(branch)).toEqual({ ...branch, slug: 'sucursal-centro' });
    });

    it('rechaza un nombre del que no sale un tramo de 3 caracteres', () => {
        const result = branchSchema.safeParse({ ...branch, name: 'Ñ!' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).name).toBe('El nombre tiene que tener al menos 3 letras o números.');
    });

    it('rechaza una zona horaria vacía', () => {
        const result = branchSchema.safeParse({ ...branch, timeZone: ' ' });
        
        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).timeZone).toBe('Ingresá la zona horaria.');
    });
});

describe('inviteEmployeeSchema', () => {
    it('acepta un email, sin espacios de más', () => {
        expect(inviteEmployeeSchema.parse({ email: ' martina@estudio.com ' })).toEqual({ email: 'martina@estudio.com' });
    });

    it('rechaza un email inválido', () => {
        const result = inviteEmployeeSchema.safeParse({ email: 'martina' });

        expect(result.success).toBe(false);
        expect(fieldErrorsOf(result.error!).email).toBe('Ingresá un email válido.');
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
