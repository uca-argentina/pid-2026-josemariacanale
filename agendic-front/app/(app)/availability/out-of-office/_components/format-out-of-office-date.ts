const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];

/** '2026-10-11' → '11 oct. 2026'. A mano y no con `Intl`: el formato es fijo y sale igual en el server y en el browser. */
export function formatOutOfOfficeDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return `${day} ${MONTHS[month - 1]} ${year}`;
}
