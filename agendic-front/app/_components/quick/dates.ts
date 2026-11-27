
const TZ = 'America/Argentina/Buenos_Aires';

export const ymd = (date: Date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: TZ });

export const addDays = (date: string, days: number) => ymd(new Date(Date.parse(`${date}T12:00:00-03:00`) + days * 86_400_000));

export const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;

export const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export const fmtMoney = (value: number | string) => Number(value).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
