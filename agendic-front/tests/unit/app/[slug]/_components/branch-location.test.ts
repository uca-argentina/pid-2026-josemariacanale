import { sortByDistance } from '@/app/[slug]/_components/branch-location';

const OBELISCO = { lat: -34.6037, lng: -58.3816 };
const cordoba = { id: 1, address: 'Córdoba', location: { lat: -31.4201, lng: -64.1888 } };
const laPlata = { id: 2, address: 'La Plata', location: { lat: -34.9205, lng: -57.9536 } };

describe('sortByDistance', () => {
    it('puts the closest Sucursal first, with its distance in km', () => {
        const sorted = sortByDistance([cordoba, laPlata], OBELISCO);

        expect(sorted.map((b) => b.id)).toEqual([2, 1]);
        // Worked distances from the Obelisco: La Plata ~52 km, Córdoba ~646 km.
        expect(sorted[0].distanceKm).toBeCloseTo(52, -1);
        expect(sorted[1].distanceKm).toBeCloseTo(646, -1);
    });

    it('keeps the order they came in, without distances, when there is no origin', () => {
        const sorted = sortByDistance([cordoba, laPlata], null);

        expect(sorted.map((b) => [b.id, b.distanceKm])).toEqual([
            [1, null],
            [2, null],
        ]);
    });

    it('leaves the Sucursales without a punto at the end, in their order and without a distance', () => {
        const sinPuntoA = { id: 3, address: 'Sin punto A', location: null };
        const sinPuntoB = { id: 4, address: 'Sin punto B', location: null };

        const sorted = sortByDistance([sinPuntoA, cordoba, sinPuntoB, laPlata], OBELISCO);

        expect(sorted.map((b) => [b.id, b.distanceKm === null])).toEqual([
            [2, false],
            [1, false],
            [3, true],
            [4, true],
        ]);
    });
});
