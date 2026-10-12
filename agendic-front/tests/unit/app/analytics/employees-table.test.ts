import { employeesCsv, filterEmployees } from '@/app/(app)/analytics/_components/employees-table';

const rows = [
    { id: 1, name: 'Ángela Pérez', counts: [3, 0] },
    { id: 2, name: 'Bruno', counts: [0, 12] },
];

describe('filterEmployees', () => {
    it('ignores case and accents', () => {
        expect(filterEmployees(rows, 'ANGELA').map((r) => r.id)).toEqual([1]);
        expect(filterEmployees(rows, 'perez').map((r) => r.id)).toEqual([1]);
    });

    it('keeps everyone on an empty or blank search', () => {
        expect(filterEmployees(rows, '')).toHaveLength(2);
        expect(filterEmployees(rows, '  ')).toHaveLength(2);
    });

    it('returns nothing when no name matches', () => {
        expect(filterEmployees(rows, 'zzz')).toEqual([]);
    });
});

describe('employeesCsv', () => {
    it('writes the bucket header and one row per Empleado, with 0 as an empty cell', () => {
        expect(employeesCsv(['5 oct', '12 oct'], rows)).toBe('Empleado,5 oct,12 oct\r\nÁngela Pérez,3,\r\nBruno,,12');
    });

    it('quotes names with commas, quotes or line breaks', () => {
        const csv = employeesCsv(['oct 2026'], [{ id: 3, name: 'Gómez, "Pepe"', counts: [1] }]);
        expect(csv).toBe('Empleado,oct 2026\r\n"Gómez, ""Pepe""",1');
    });

    it('is just the header with no rows', () => {
        expect(employeesCsv(['a'], [])).toBe('Empleado,a');
    });
});
