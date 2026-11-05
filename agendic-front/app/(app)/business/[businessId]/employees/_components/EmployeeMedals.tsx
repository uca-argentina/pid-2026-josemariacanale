import { Medal } from '@/app/_components/Medal';
import { LEVEL_NAMES } from '@/app/_components/medal-style';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/ui/tooltip';
import type { EmployeeBadge } from '@/src/entities/models/employee';

/** Cuántas medallas se ven en una fila de la tabla antes del "+N". */
const MAX_VISIBLE_MEDALS = 3;

const tooltipLabel = ({ name, level }: EmployeeBadge) => `${name} · ${LEVEL_NAMES[level]}`;

/**
 * Las medallas de un Empleado en una fila del Staff: las `MAX_VISIBLE_MEDALS` de mayor Nivel y un "+N" con el resto.
 * `badges` ya viene ordenada de mayor a menor Nivel. Sin Insignias no renderiza nada.
 */
export function EmployeeMedals({ badges }: { badges: EmployeeBadge[] }) {
    if (badges.length === 0) return null;
    const rest = badges.slice(MAX_VISIBLE_MEDALS);
    return (
        <div className="flex shrink-0 items-center gap-1">
            {badges.slice(0, MAX_VISIBLE_MEDALS).map((b) => (
                <Tooltip key={b.badge}>
                    <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-full" />}>
                        <Medal badge={b.badge} name={b.name} level={b.level} size="sm" />
                    </TooltipTrigger>
                    <TooltipContent>{tooltipLabel(b)}</TooltipContent>
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
                            <span key={b.badge}>{tooltipLabel(b)}</span>
                        ))}
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

/** Todas las Insignias de un Empleado en tamaño grande, con su nombre y Nivel. Sin Insignias no renderiza nada. */
export function EmployeeMedalsLarge({ badges }: { badges: EmployeeBadge[] }) {
    if (badges.length === 0) return null;
    return (
        <section aria-label="Insignias" className="flex flex-col gap-3">
            <h3 className="m-0 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">Insignias</h3>
            <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
                {badges.map((b) => (
                    <li key={b.badge} className="flex w-24 flex-col items-center gap-2 text-center">
                        <Medal badge={b.badge} name={b.name} level={b.level} />
                        <span className="text-[12.5px] leading-tight font-semibold">{b.name}</span>
                        <span className="text-[12px] font-medium text-[#6b7280]">{LEVEL_NAMES[b.level]}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
