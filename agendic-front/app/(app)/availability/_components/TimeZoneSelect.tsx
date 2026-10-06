import { PanelSelect } from '@/app/(app)/_components/panel-ui';

const ZONES = Intl.supportedValuesOf('timeZone');

/** Elige una zona horaria IANA; si la actual no está en la lista del navegador (por ejemplo `UTC`), se suma. */
export function TimeZoneSelect({ id, value, onChange }: { id?: string; value: string; onChange: (timeZone: string) => void }) {
    const zones = ZONES.includes(value) ? ZONES : [value, ...ZONES];
    return <PanelSelect id={id} value={value} onValueChange={onChange} options={zones.map((z) => ({ value: z, label: z }))} />;
}
