import { depositAmount, findService, formatPrice, groups, publicUrl } from '@/app/(app)/_components/mock-services';
import { canStopOffering } from '@/app/(app)/services/_components/offering';

describe('depositAmount', () => {
    it('es el porcentaje del precio, redondeado a pesos enteros', () => {
        expect(depositAmount(18000, 20)).toBe(3600);
        expect(depositAmount(9999, 15)).toBe(1500);
    });
});

describe('formatPrice', () => {
    it('muestra pesos sin decimales, igual que la página pública', () => {
        expect(formatPrice(18000)).toBe('$18.000');
    });
});

describe('publicUrl', () => {
    // docs/agents/domain.md: la URL del front del Enlace de reserva es /business/<slug>.
    it('cuelga el Servicio del Enlace de reserva del Negocio', () => {
        expect(publicUrl('vitalia', 'masaje')).toBe('https://agendic.app/business/vitalia/masaje');
    });
});

describe('findService', () => {
    it('devuelve el Servicio con su grupo', () => {
        const [group] = groups;
        const [service] = group.services;
        expect(findService(service.id)).toEqual({ group, service });
    });

    it('devuelve undefined si no existe', () => {
        expect(findService('inexistente')).toBeUndefined();
    });
});

describe('groups', () => {
    it('trae, en cada negocio, un Servicio que podés dejar de ofrecer y uno que no', () => {
        const all = groups.flatMap((g) => g.services);
        expect(all.some((s) => s.offeredByMe && canStopOffering(s))).toBe(true);
        expect(all.some((s) => s.offeredByMe && !canStopOffering(s))).toBe(true);
        for (const g of groups) expect(g.services.some((s) => s.offeredByMe && !canStopOffering(s))).toBe(true);
    });

    // El mock tiene que poder mostrar las dos vistas: la del Dueño y la del Empleado.
    it('trae un negocio propio y uno donde el usuario es Empleado', () => {
        expect(groups.map((g) => g.role).sort()).toEqual(['employee', 'owner']);
    });

    it('no repite ids entre negocios', () => {
        const ids = groups.flatMap((g) => g.services.map((s) => s.id));
        expect(new Set(ids).size).toBe(ids.length);
    });
});
