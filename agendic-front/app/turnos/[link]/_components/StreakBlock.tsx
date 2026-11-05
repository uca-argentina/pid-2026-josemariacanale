import { Flame, Gift } from 'lucide-react';
import type { ClientStreakView } from '@/app/_components/client-booking/types';

/**
 * El bloque Tu Racha del Enlace del Turno: cuántos Turnos lleva el Cliente, una barra de avance hacia la próxima
 * Recompensa, hasta cuándo tiene que volver para no quemarla y sus Premios disponibles, con su vencimiento. El Cliente
 * no Canjea: el Premio se pide en el próximo Turno.
 */
export function StreakBlock({ streak }: { streak: NonNullable<ClientStreakView> }) {
    const { title, progress, nextReward, returnBy, prizes } = streak;

    return (
        <section aria-label="Tu Racha" className="mt-6 rounded-2xl border border-border p-6">
            <h2 className="m-0 flex items-center gap-2 text-[13px] font-bold tracking-[0.04em] text-muted-foreground uppercase">
                <Flame className="size-4" />
                Tu Racha
            </h2>
            <p className="mt-2 text-[26px] leading-tight font-extrabold tracking-[-0.03em]">{title}</p>

            {progress && (
                <div className="mt-3 flex flex-col gap-1.5">
                    <div
                        role="progressbar"
                        aria-label="Avance hacia la próxima Recompensa"
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-valuenow={progress.done}
                        aria-valuetext={`${progress.done} de ${progress.total} Turnos`}
                        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                    >
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                    {nextReward && <p className="m-0 text-[14px] font-medium">{nextReward}</p>}
                </div>
            )}
            {returnBy && <p className="mt-2 mb-0 text-[14px] text-muted-foreground">{returnBy}</p>}

            {prizes.length > 0 && (
                <div className="mt-5 flex flex-col gap-2">
                    <h3 className="m-0 text-[13px] font-bold tracking-[0.04em] text-muted-foreground uppercase">Tus Premios</h3>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {prizes.map((prize) => (
                            <li key={prize.id} className="flex items-start gap-3 rounded-xl bg-muted p-3.5">
                                <Gift className="mt-0.5 size-4 shrink-0" />
                                <span className="flex min-w-0 flex-col">
                                    <span className="text-[14px] font-semibold break-words">{prize.text}</span>
                                    {prize.expires && <span className="text-[13px] text-muted-foreground">{prize.expires}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="m-0 text-[13px] text-muted-foreground">Pedilo en tu próximo Turno.</p>
                </div>
            )}
        </section>
    );
}
