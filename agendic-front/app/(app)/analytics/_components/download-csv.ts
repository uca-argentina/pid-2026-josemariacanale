/** Baja `csv` como `filename`; el BOM hace que Excel lo lea como UTF-8. */
export function downloadCsv(filename: string, csv: string) {
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
}
