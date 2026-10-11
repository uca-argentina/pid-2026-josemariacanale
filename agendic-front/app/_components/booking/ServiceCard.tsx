'use client';

import { Button } from '@/app/_components/ui/button';
import { formatDuration, formatPrice } from './format';
import type { Service } from './types';

/** Un Servicio de la vidriera de una Sucursal o de un Usuario, con su botón de Reservar. `panel` usa la paleta del sidebar del panel. */
export function ServiceCard({
    service,
    onBook,
    panel = false,
}: {
    service: Service;
    onBook: (service: Service) => void;
    panel?: boolean;
}) {
    const strong = panel ? 'text-sidebar-foreground' : '';
    const muted = panel ? 'text-sidebar-muted-foreground' : 'text-muted-foreground';
    return (
        <article className={`flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4.5 transition-colors hover:border-foreground/20 sm:flex-nowrap ${panel ? 'bg-white' : ''}`}>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className={`text-[15.5px] font-bold tracking-[-0.02em] ${strong}`}>{service.name}</h3>
                <span className={`text-[13px] font-medium ${muted}`}>
                    {formatDuration(service.durationMinutes)}
                </span>
                {service.description && (
                    <p className={`mt-0.5 max-w-[62ch] text-[13.5px] leading-relaxed ${muted}`}>
                        {service.description}
                    </p>
                )}
                <span className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <span className={`text-[15px] font-extrabold tracking-[-0.025em] ${strong}`}>
                        {formatPrice(service.price)}
                    </span>
                    {!!service.depositPercent && (
                        <span className={`text-[12.5px] font-semibold ${muted}`}>
                            {service.depositPercent}% de seña
                        </span>
                    )}
                </span>
            </div>
            <Button
                onClick={() => onBook(service)}
                variant="outline"
                className={`h-auto shrink-0 rounded-full px-5 py-2.5 text-[13.5px] font-bold ${panel ? 'border-sidebar-accent-foreground bg-white text-sidebar-accent-foreground hover:bg-[#f2f7ff] hover:text-sidebar-accent-foreground' : ''}`}
            >
                Reservar
            </Button>
        </article>
    );
}
