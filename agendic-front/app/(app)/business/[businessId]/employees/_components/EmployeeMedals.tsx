import { Medal } from '@/app/_components/Medal';
import { badgeDescription } from '@/app/_components/badge-descriptions';
import { LEVEL_NAMES } from '@/app/_components/medal-style';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/ui/tooltip';
import type { EmployeeBadge } from '@/src/entities/models/employee';
import { medalTooltip, splitMedals } from './employee-medals';

/**
 * Las medallas de un Empleado en una fila del Staff: las de mayor Nivel y un "+N" con el resto.
 * `badges` ya viene ordenada de mayor a menor Nivel. Sin Insignias no renderiza nada.
 */
export function EmployeeMedals({ badges }: { badges: EmployeeBadge[] }) {
    if (badges.length === 0) return null;
    const { visible, rest } = splitMedals(badges);
    return (
        <div className="flex shrink-0 items-center gap-1">
            {visible.map((b) => (
                <Tooltip key={b.badge}>
                    <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-full" />}>
                        <Medal badge={b.badge} name={b.name} level={b.level} size="sm" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56 flex-col items-start">
                        <span>{medalTooltip(b)}</span>
                        {badgeDescription(b.badge) && <span className="font-normal opacity-80">{badgeDescription(b.badge)}</span>}
                    </TooltipContent>
                </Tooltip>
            ))}
            {rest.length > 0 && (
                <Tooltip>
                    <TooltipTrigger
                        render={<span tabIndex={0} aria-label={`${rest.length} Insignias más`} className="text-[12px] font-bold text-[#6b7280]" />}
                    >
                        +{rest.length}
                    </TooltipTrigger>
                    <TooltipContent className="flex-col items-start">
                        {rest.map((b) => (
                            <span key={b.badge}>{medalTooltip(b)}</span>
                        ))}
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

/** Todas las Insignias de un Empleado en tamaño grande, con su nombre y Nivel, en el orden de `badges` (de mayor a menor Nivel). Sin Insignias no renderiza nada. */
export function EmployeeMedalsLarge({ badges }: { badges: EmployeeBadge[] }) {
    if (badges.length === 0) return null;
    return (
        <section aria-label="Insignias" className="flex flex-col gap-3">
            <h3 className="m-0 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">Insignias</h3>
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {badges.map((b) => (
                    <li key={b.badge} className="flex items-center gap-3">
                        <Medal badge={b.badge} name={b.name} level={b.level} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[13px] leading-tight font-semibold">
                                {b.name} <span className="font-medium text-[#6b7280]">· {LEVEL_NAMES[b.level]}</span>
                            </span>
                            {badgeDescription(b.badge) && (
                                <span className="text-[12px] leading-snug text-[#6b7280]">{badgeDescription(b.badge)}</span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
