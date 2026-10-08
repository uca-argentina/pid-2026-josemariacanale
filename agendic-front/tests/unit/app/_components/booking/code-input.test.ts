import { CODE_LENGTH, EMPTY_CODE, sanitizeCode, writeCode } from '@/app/_components/booking/code-input';

describe('sanitizeCode', () => {
    it('pasa a mayúsculas', () => {
        expect(sanitizeCode('abc234')).toBe('ABC234');
    });

    it('descarta lo que no está en el alfabeto del código', () => {
        expect(sanitizeCode('a-b 1c!')).toBe('ABC');
    });
});

describe('writeCode', () => {
    it('escribe un carácter en su casilla y pasa el foco a la siguiente', () => {
        expect(writeCode(EMPTY_CODE, 0, 'a')).toEqual({ chars: ['A', '', '', '', '', ''], focus: 1 });
    });

    it('llena las seis casillas con el código pegado desde la primera', () => {
        expect(writeCode(EMPTY_CODE, 0, 'abc234')).toEqual({ chars: ['A', 'B', 'C', '2', '3', '4'], focus: CODE_LENGTH - 1 });
    });

    it('descarta lo que no entra desde esa casilla', () => {
        expect(writeCode(EMPTY_CODE, 4, 'abc')).toEqual({ chars: ['', '', '', '', 'A', 'B'], focus: CODE_LENGTH - 1 });
    });

    it('reemplaza lo que ya había en las casillas que escribe, sin tocar las demás', () => {
        expect(writeCode(['X', 'Y', 'Z', '', '', ''], 1, 'ab')).toEqual({ chars: ['X', 'A', 'B', '', '', ''], focus: 3 });
    });

    it('deja todo como está cuando no queda ningún carácter válido', () => {
        expect(writeCode(EMPTY_CODE, 2, '-1 ')).toEqual({ chars: [...EMPTY_CODE], focus: 2 });
    });
});
