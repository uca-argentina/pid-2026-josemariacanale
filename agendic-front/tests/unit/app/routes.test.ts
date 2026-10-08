import { bookAgainPath, bookingPath } from '@/app/routes';

describe('bookingPath', () => {
    it('es la ruta del Enlace del Turno', () => {
        expect(bookingPath('s3cr3t-l1nk')).toBe('/turnos/s3cr3t-l1nk');
    });
});

describe('bookAgainPath', () => {
    it('lleva a la Sucursal, sin Servicio elegido, en un Servicio del Negocio', () => {
        expect(bookAgainPath({ business: { slug: 'peluqueria-luna' }, branch: { slug: 'centro' }, user: null })).toBe(
            '/business/peluqueria-luna/centro',
        );
    });

    it('lleva a la página del Usuario en un Servicio personal', () => {
        expect(bookAgainPath({ business: null, branch: null, user: { slug: 'juana' } })).toBe('/u/juana');
    });

    it('no lleva a ningún lado sin Sucursal ni Usuario', () => {
        expect(bookAgainPath({ business: { slug: 'peluqueria-luna' }, branch: null, user: null })).toBeNull();
    });
});
