import { Medal } from '@/app/_components/Medal';
import { badgeDescription } from '@/app/_components/badge-descriptions';
import { LEVEL_NAMES } from '@/app/_components/medal-style';
import type { MyBadge } from '@/src/entities/models/badge';
import { achieved, earnedAt, inProgress, progressPercent, progressText } from './achievements';
import { EarnedDate } from './EarnedDate';

/** La pantalla Logros: las Insignias en curso con su avance y las conseguidas con la fecha. Una puede estar en las dos. */
export function AchievementsView({ badges }: { badges: MyBadge[] }) {
    const ongoing = inProgress(badges);
    const won = achieved(badges);

    return (
        <div className="flex flex-1 flex-col gap-8 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-col gap-1">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Logros</h1>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">Tus Insignias y cuánto te falta para el próximo Nivel.</p>
            </header>

            <Group title="En curso" empty="No tenés Insignias en curso.">
                {ongoing.map((badge) => {
                    const percent = progressPercent(badge.progress!);
                    return (
                        <li key={badge.badge} className="flex items-center gap-4 rounded-xl border border-[#e5e7eb] p-4">
                            <Medal badge={badge.badge} name={badge.name} level={badge.level} />
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <span className="text-[14px] font-bold">{badge.name}</span>
                                <Description badge={badge.badge} />
                                <div
                                    role="progressbar"
                                    aria-label={`Progreso de ${badge.name}`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={percent}
                                    className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]"
                                >
                                    <div className="h-full rounded-full bg-[#0f1b2d]" style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-[12px] font-medium text-[#6b7280]">{progressText(badge)}</span>
                            </div>
                        </li>
                    );
                })}
            </Group>

            <Group title="Conseguidas" empty="Todavía no ganaste ninguna Insignia.">
                {won.map((badge) => {
                    const earned = earnedAt(badge);
                    return (
                        <li key={badge.badge} className="flex items-center gap-4 rounded-xl border border-[#e5e7eb] p-4">
                            <Medal badge={badge.badge} name={badge.name} level={badge.level} />
                            <div className="flex min-w-0 flex-col gap-1">
                                <span className="text-[14px] font-bold">{badge.name}</span>
                                <Description badge={badge.badge} />
                                <span className="text-[12px] font-medium text-[#6b7280]">
                                    Nivel {LEVEL_NAMES[badge.level!]}
                                    {earned && (
                                        <>
                                            {' · '}
                                            <EarnedDate earnedAt={earned} />
                                        </>
                                    )}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </Group>
        </div>
    );
}

function Description({ badge }: { badge: string }) {
    const text = badgeDescription(badge);
    return text && <span className="text-[12.5px] leading-snug text-[#374151]">{text}</span>;
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="m-0 text-[15px] font-extrabold tracking-[-0.02em]">{title}</h2>
            {children.length > 0 ? (
                <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">{children}</ul>
            ) : (
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">{empty}</p>
            )}
        </section>
    );
}
