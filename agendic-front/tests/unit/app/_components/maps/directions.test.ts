import { directionsUrl } from '@/app/_components/maps/directions';

describe('directionsUrl', () => {
    it('points Google Maps at the punto of the Sucursal', () => {
        expect(directionsUrl({ address: 'Av. Corrientes 1234', location: { lat: -34.6037, lng: -58.3816 } })).toBe(
            'https://www.google.com/maps/dir/?api=1&destination=-34.6037,-58.3816',
        );
    });

    it('falls back to the encoded address when the Sucursal has no punto', () => {
        expect(directionsUrl({ address: 'Av. Corrientes 1234, CABA & más', location: null })).toBe(
            'https://www.google.com/maps/dir/?api=1&destination=Av.%20Corrientes%201234%2C%20CABA%20%26%20m%C3%A1s',
        );
    });
});
