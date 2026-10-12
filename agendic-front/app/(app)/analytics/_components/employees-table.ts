/** Una fila de la tabla "Turnos por Empleado y período": el Empleado y su conteo en cada bucket. */
export type EmployeeRow = { id: number; name: string; counts: number[] };

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Las filas cuyo nombre contiene `search`, sin distinguir mayúsculas ni acentos; una búsqueda vacía las deja todas. */
export const filterEmployees = <R extends Pick<EmployeeRow, 'name'>>(rows: R[], search: string): R[] => {
    const wanted = normalize(search.trim());
    return rows.filter(({ name }) => normalize(name).includes(wanted));
};

const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

/** El CSV de la tabla: el encabezado con los buckets y una fila por Empleado; un 0 es una celda vacía, como en pantalla. */
export const employeesCsv = (labels: string[], rows: EmployeeRow[]): string =>
    [['Empleado', ...labels], ...rows.map(({ name, counts }) => [name, ...counts.map((n) => (n === 0 ? '' : String(n)))])]
        .map((line) => line.map(cell).join(','))
        .join('\r\n');
