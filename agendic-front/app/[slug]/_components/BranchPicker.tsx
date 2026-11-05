'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { LocateFixed, MapPin } from 'lucide-react';
import { LocationMap } from '@/app/_components/maps/LocationMap';
import { useGoogleMaps } from '@/app/_components/maps/google-maps';
import { Button } from '@/app/_components/ui/button';
import { cn } from '@/app/_components/utils';
import { bookingLinkPath } from '@/app/routes';
import type { Location } from '@/src/entities/models/branch';
import { sortByDistance } from './branch-location';
import type { BusinessBranch } from './types';

const km = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

type Locating = 'idle' | 'locating' | 'failed';

/**
 * Las Sucursales de un Negocio para que el Cliente elija: un mapa con un punto por Sucursal que tenga Ubicación y la
 * lista al costado (debajo, si no hay lugar). Tocar un punto resalta su Sucursal en la lista. "Usar mi ubicación"
 * ordena la lista por distancia sin guardar nada; sin permiso, o si falla, la lista queda como vino y lo avisa.
 */
export function BranchPicker({ businessSlug, branches }: { businessSlug: string; branches: BusinessBranch[] }) {
    const maps = useGoogleMaps();
    const [origin, setOrigin] = useState<Location | null>(null);
    const [locating, setLocating] = useState<Locating>('idle');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const items = useRef(new Map<number, HTMLLIElement>());

    // The map keeps the original order, so sorting the list does not redraw it.
    const located = branches.filter((b) => b.location !== null);
    const showMap = maps !== false && located.length > 0;
    const listed = origin ? sortByDistance(branches, origin) : branches.map((b) => ({ ...b, distanceKm: null }));

    const select = (index: number) => {
        const id = located[index].id;
        setSelectedId(id);
        items.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    const locate = () => {
        if (!('geolocation' in navigator)) return setLocating('failed');
        setLocating('locating');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setOrigin({ lat: coords.latitude, lng: coords.longitude });
                setLocating('idle');
            },
            () => setLocating('failed'),
            { timeout: 10_000, maximumAge: 300_000 },
        );
    };

    return (
        <div className="@container/branches">
            <div className={cn('grid gap-4', showMap && '@3xl/branches:grid-cols-[minmax(0,1fr)_340px]')}>
                {showMap && (
                    <LocationMap
                        label="Mapa de las sucursales"
                        points={located.map((b) => b.location!)}
                        onSelect={select}
                        className="h-72 rounded-2xl @3xl/branches:sticky @3xl/branches:top-6 @3xl/branches:h-[480px]"
                    />
                )}

                <div className="min-w-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={locate}
                        disabled={locating === 'locating'}
                        className="h-11 gap-2 rounded-full px-4 text-[14px] font-bold"
                    >
                        <LocateFixed className="size-4" />
                        {locating === 'locating' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
                    </Button>
                    <p role="status" className="mt-2 min-h-5 text-[13px] text-muted-foreground">
                        {locating === 'failed' && 'No pudimos saber dónde estás: las sucursales quedan en su orden.'}
                    </p>

                    <ul className="mt-2 flex flex-col gap-3">
                        {listed.map((branch) => (
                            <li
                                key={branch.id}
                                ref={(el) => {
                                    if (el) items.current.set(branch.id, el);
                                    else items.current.delete(branch.id);
                                }}
                            >
                                <Link
                                    href={bookingLinkPath(businessSlug, branch.slug)}
                                    aria-current={branch.id === selectedId ? 'true' : undefined}
                                    className={cn(
                                        'flex flex-col gap-1 rounded-2xl border border-border p-4.5 transition-colors hover:border-foreground/20',
                                        branch.id === selectedId && 'border-foreground ring-1 ring-foreground',
                                    )}
                                >
                                    <span className="flex items-baseline justify-between gap-3">
                                        <span className="min-w-0 text-[15.5px] font-bold tracking-[-0.02em] break-words">
                                            {branch.name}
                                        </span>
                                        {branch.distanceKm !== null && (
                                            <span className="shrink-0 text-[13px] font-semibold text-muted-foreground">
                                                {km.format(branch.distanceKm)} km
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex items-start gap-1.5 text-[13.5px] text-muted-foreground">
                                        <MapPin className="mt-0.5 size-4 shrink-0" />
                                        <span className="min-w-0 break-words">{branch.address}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
