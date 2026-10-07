'use client';

import { Button } from '@/app/_components/ui/button';
import { formatDuration, formatPrice } from './format';
import type { Service } from './types';

/** Un Servicio de la vidriera de una Sucursal o de un Usuario, con su botón de Reservar. */
export function ServiceCard({
    service,
    onBook,
}: {
    service: Service;
    onBook: (service: Service) => void;
}) {
    return (
        <article className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4.5 transition-colors hover:border-foreground/20 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-[15.5px] font-bold tracking-[-0.02em]">{service.name}</h3>
                <span className="text-[13px] font-medium text-muted-foreground">
                    {formatDuration(service.durationMinutes)}
                </span>
                {service.description && (
                    <p className="mt-0.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
                        {service.description}
                    </p>
                )}
                <span className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="text-[15px] font-extrabold tracking-[-0.025em]">
                        {formatPrice(service.price)}
                    </span>
                    {!!service.depositPercent && (
                        <span className="text-[12.5px] font-semibold text-muted-foreground">
                            {service.depositPercent}% de seña
                        </span>
                    )}
                </span>
            </div>
            <Button
                onClick={() => onBook(service)}
                variant="outline"
                className="h-auto min-h-11 w-full shrink-0 rounded-full px-5 py-2.5 text-[13.5px] font-bold sm:w-auto"
            >
                Reservar
            </Button>
        </article>
    );
}
