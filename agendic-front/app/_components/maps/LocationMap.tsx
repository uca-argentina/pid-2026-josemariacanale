'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/app/_components/utils';
import { loadGoogleMaps, MAP_ID } from './google-maps';

type Point = { lat: number; lng: number };

/** Zoom de calle, para ver un solo punto. */
const SINGLE_POINT_ZOOM = 16;

/**
 * Un mapa de Google con un marcador por punto. Con `onMove` hay un solo punto y se puede arrastrar para corregirlo.
 * Sin SDK (falta la key o no cargó) no dibuja nada.
 */
export function LocationMap({
    points,
    onMove,
    label = 'Mapa',
    className,
}: {
    points: Point[];
    /** Recibe el punto nuevo al soltar el marcador. */
    onMove?: (point: Point) => void;
    label?: string;
    className?: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<google.maps.Map | null>(null);
    const onMoveRef = useRef(onMove);
    useEffect(() => {
        onMoveRef.current = onMove;
    });
    const draggable = !!onMove;
    // Points arrive as a fresh array each render: key the effect on their values, not their identity.
    const key = JSON.stringify(points);

    useEffect(() => {
        let alive = true;
        const markers: google.maps.marker.AdvancedMarkerElement[] = [];
        const current: Point[] = JSON.parse(key);

        (async () => {
            if (!(await loadGoogleMaps()) || !alive || !container.current) return;
            const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
                google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
                google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
            ]);
            if (!alive) return;
            map.current ??= new Map(container.current, {
                mapId: MAP_ID,
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'cooperative',
            });

            for (const position of current) {
                const marker = new AdvancedMarkerElement({ map: map.current, position, gmpDraggable: draggable });
                if (draggable) {
                    marker.addListener('dragend', () => {
                        const moved = new google.maps.LatLng(marker.position!);
                        onMoveRef.current?.({ lat: moved.lat(), lng: moved.lng() });
                    });
                }
                markers.push(marker);
            }

            if (current.length === 1) {
                map.current.setCenter(current[0]);
                map.current.setZoom(SINGLE_POINT_ZOOM);
            } else if (current.length > 1) {
                const bounds = new google.maps.LatLngBounds();
                current.forEach((p) => bounds.extend(p));
                map.current.fitBounds(bounds);
            }
        })();

        return () => {
            alive = false;
            markers.forEach((marker) => (marker.map = null));
        };
    }, [key, draggable]);

    return <div ref={container} role="region" aria-label={label} className={cn('h-56 w-full rounded-md border border-[#e5e7eb]', className)} />;
}
