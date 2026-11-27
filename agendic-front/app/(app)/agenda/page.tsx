import { back } from '@/app/_components/back';
import { ActionButton } from '@/app/_components/quick/ActionButton';
import { addDays, fmtTime, ymd } from '@/app/_components/quick/dates';
import { cancelarTurno, marcarAusencia, registrarLlegada } from './actions';

type Turno = {
    id: number;
    startsAt: string;
    endsAt: string;
    status: string;
    noShowAt: string | null;
    llegoEn: string | null;
    llegoTarde: boolean;
    client: { name: string } | null;
    service: { name: string };
};

function estado(t: Turno) {
    if (t.llegoEn)
        return `${t.llegoTarde ? 'Llegó tarde' : 'Llegó'} (${fmtTime(t.llegoEn)})`;
    if (t.noShowAt) return 'Ausencia';
    return t.status;
}

export default async function AgendaPage({
    searchParams,
}: {
    searchParams: Promise<{ fecha?: string }>;
}) {
    const { fecha = ymd() } = await searchParams;
    const result = await back<Turno[]>('GET', `/agenda?fecha=${fecha}`, {
        auth: true,
    });
    if (!result.ok)
        return <p className="p-4 text-destructive">{result.message}</p>;

    return (
        <div className="flex flex-col gap-4 p-4">
            <p>
                <a className="underline" href={`?fecha=${addDays(fecha, -1)}`}>
                    ← anterior
                </a>{' '}
                · <b>Agenda del {fecha}</b> ·{' '}
                <a className="underline" href={`?fecha=${addDays(fecha, 1)}`}>
                    siguiente →
                </a>
            </p>

            {result.data.length === 0 && <p>No hay turnos este día.</p>}

            <table className="text-left text-sm">
                <tbody>
                    {result.data.map((t) => {
                        const yaLlego = t.llegoEn ? 'Ya llegó' : null;
                        return (
                            <tr key={t.id} className="border-b align-top">
                                <td className="p-2">#{t.id}</td>
                                <td className="p-2">
                                    {fmtTime(t.startsAt)}–{fmtTime(t.endsAt)}
                                </td>
                                <td className="p-2">{t.client?.name ?? '—'}</td>
                                <td className="p-2">{t.service.name}</td>
                                <td className="p-2 font-medium">{estado(t)}</td>
                                <td className="p-2">
                                    <ActionButton
                                        action={registrarLlegada.bind(
                                            null,
                                            t.id,
                                        )}
                                        size="sm"
                                        disabledReason={yaLlego}
                                    >
                                        Llegó
                                    </ActionButton>
                                </td>
                                <td className="p-2">
                                    <ActionButton
                                        action={marcarAusencia.bind(null, t.id)}
                                        size="sm"
                                        variant="outline"
                                    >
                                        Ausencia
                                    </ActionButton>
                                </td>
                                <td className="p-2">
                                    <ActionButton
                                        action={cancelarTurno.bind(null, t.id)}
                                        size="sm"
                                        variant="destructive-outline"
                                    >
                                        Cancelar
                                    </ActionButton>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
