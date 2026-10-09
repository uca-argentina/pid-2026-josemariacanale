import { bookAgainPath, bookingPath, sectionOf } from '@/app/routes';

describe('sectionOf', () => {
    const sections = [
        { href: '/bookings', label: 'Turnos' },
        { href: '/services', label: 'Servicios' },
        { href: '/business', label: 'Mi Negocio' },
        { href: '/analytics', label: 'Analíticas' },
    ];

    it('es la sección cuya ruta es la actual', () => {
        expect(sectionOf('/analytics', sections)?.label).toBe('Analíticas');
    });

    it('sigue siendo la sección en una subpantalla', () => {
        expect(sectionOf('/services/12', sections)?.label).toBe('Servicios');
        expect(sectionOf('/business/employees', sections)?.label).toBe('Mi Negocio');
    });

    it('no coincide con una ruta que solo comparte el prefijo de texto', () => {
        expect(sectionOf('/business-hours', sections)).toBeNull();
    });

    it('no es ninguna sección en una ruta fuera del panel', () => {
        expect(sectionOf('/turnos/s3cr3t-l1nk', sections)).toBeNull();
    });
});

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
