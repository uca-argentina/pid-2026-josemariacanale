import { readBookingPrefill } from '@/app/_components/booking/booking-prefill';

describe('readBookingPrefill', () => {
    it('sin parámetros no precarga nada', () => {
        expect(readBookingPrefill({})).toEqual({ date: null, name: '', email: '' });
    });

    it('lee fecha, nombre y email válidos', () => {
        expect(readBookingPrefill({ fecha: '2026-10-20', nombre: 'Ana Pérez', email: 'ana@mail.com' })).toEqual({
            date: '2026-10-20',
            name: 'Ana Pérez',
            email: 'ana@mail.com',
        });
    });

    it('los valores ya decodificados de la URL llegan tal cual', () => {
        const params = Object.fromEntries(new URLSearchParams('fecha=2026-10-20&nombre=Ana%20P%C3%A9rez&email=ana%2Bturnos%40mail.com'));
        expect(readBookingPrefill(params)).toEqual({ date: '2026-10-20', name: 'Ana Pérez', email: 'ana+turnos@mail.com' });
    });

    it.each(['2026-02-30', '2026-13-01', '2026-00-10', '20-10-2026', '2026-10-2', 'mañana', '', '2026-10-20T10:00'])(
        'ignora la fecha %j',
        (fecha) => {
            expect(readBookingPrefill({ fecha }).date).toBeNull();
        },
    );

    it('acepta el 29 de febrero solo en año bisiesto', () => {
        expect(readBookingPrefill({ fecha: '2028-02-29' }).date).toBe('2028-02-29');
        expect(readBookingPrefill({ fecha: '2027-02-29' }).date).toBeNull();
    });

    it.each(['ana', 'ana@', '@mail.com', 'ana mail@x.com', ''])('ignora el email %j', (email) => {
        expect(readBookingPrefill({ email }).email).toBe('');
    });

    it('un parámetro inválido no tira abajo a los válidos', () => {
        expect(readBookingPrefill({ fecha: 'xx', nombre: 'Ana', email: 'no' })).toEqual({ date: null, name: 'Ana', email: '' });
    });

    it('recorta espacios', () => {
        expect(readBookingPrefill({ nombre: '  Ana ', email: ' ana@mail.com ' })).toMatchObject({ name: 'Ana', email: 'ana@mail.com' });
    });

    it('si un parámetro viene repetido toma el primero', () => {
        expect(readBookingPrefill({ nombre: ['Ana', 'Luis'], fecha: ['2026-10-20', '2026-10-21'] })).toMatchObject({
            name: 'Ana',
            date: '2026-10-20',
        });
    });
});
