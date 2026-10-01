import { canStopOffering, offersIt, othersAttending } from '@/app/(app)/services/_components/offering';

const service = {
    id: 100,
    name: 'Masaje',
    employees: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Sofía Ledesma' },
    ],
};
const alone = { ...service, employees: [{ id: 1, name: 'Ana' }] };

describe('offersIt', () => {
    it('dice si el Empleado atiende el Servicio', () => {
        expect(offersIt(service, 1)).toBe(true);
        expect(offersIt(service, 3)).toBe(false);
    });
});

describe('othersAttending', () => {
    it('nombra a los demás Empleados que lo atienden', () => {
        expect(othersAttending(service, 1)).toEqual(['Sofía Ledesma']);
        expect(othersAttending(service, 3)).toEqual(['Ana', 'Sofía Ledesma']);
    });
});

describe('canStopOffering', () => {
    it('no aplica si no lo ofrece', () => {
        expect(canStopOffering(service, 3)).toBe(false);
    });

    it('no lo deja si es el único que lo ofrece', () => {
        expect(canStopOffering(alone, 1)).toBe(false);
    });

    it('lo deja si otro Empleado lo sigue ofreciendo', () => {
        expect(canStopOffering(service, 1)).toBe(true);
    });
});
