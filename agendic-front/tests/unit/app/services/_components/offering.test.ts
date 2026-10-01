import { canStopOffering } from '@/app/(app)/services/_components/offering';

describe('canStopOffering', () => {
    const base = { name: 'Masaje' };

    it('no aplica si no lo ofrecés', () => {
        expect(canStopOffering({ ...base, offeredByMe: false, otherEmployees: ['Sofía Ledesma'] })).toBe(false);
    });

    // Un Servicio no puede quedar sin nadie que lo atienda.
    it('no te deja si sos el único que lo ofrece', () => {
        expect(canStopOffering({ ...base, offeredByMe: true, otherEmployees: [] })).toBe(false);
    });

    it('te deja si otro Empleado lo sigue ofreciendo', () => {
        expect(canStopOffering({ ...base, offeredByMe: true, otherEmployees: ['Sofía Ledesma'] })).toBe(true);
    });
});
