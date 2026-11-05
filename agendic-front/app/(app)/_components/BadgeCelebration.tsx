'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Medal } from '@/app/_components/Medal';
import { LEVEL_NAMES } from '@/app/_components/medal-style';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import type { UnseenBadge } from '@/src/entities/models/badge';
import { markBadgesSeenAction } from './badge-celebration-actions';

const CONFETTI_Z_INDEX = 55;

/** El Usuario pidió menos movimiento: ni animación de entrada ni confeti. */
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Celebra los Niveles que el Usuario ganó y todavía no vio: un modal por Nivel, de a uno y en orden, con confeti
 * detrás. Al cerrar el último los marca todos como vistos. Si el marcado falla no pasa nada: se celebran de nuevo
 * en la próxima carga.
 *
 * @param badges Niveles sin ver, ya ordenados por `earnedAt`
 */
export function BadgeCelebration({ badges }: { badges: UnseenBadge[] }) {
    const [index, setIndex] = useState(0);
    const current = badges[index];

    useEffect(() => {
        if (!current || prefersReducedMotion()) return;
        // The Dialog popup sits at z-60 and its overlay at z-50, so the confetti shows over the overlay but behind the modal.
        void confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 }, zIndex: CONFETTI_Z_INDEX });
        return () => {
            void confetti.reset();
        };
    }, [current]);

    if (!current) return null;
    const isLast = index === badges.length - 1;

    const close = () => {
        if (isLast) void markBadgesSeenAction();
        setIndex(index + 1);
    };

    return (
        <Dialog key={index} open onOpenChange={(open) => !open && close()}>
            <DialogContent className="z-60 items-center text-center motion-reduce:animate-none motion-reduce:duration-0 sm:max-w-xs">
                <DialogHeader className="items-center">
                    <Medal badge={current.badge} name={current.name} level={current.level} className="size-24 [&_svg]:size-12" />
                    <DialogTitle>{current.name}</DialogTitle>
                    <DialogDescription>{`¡Ganaste el Nivel ${LEVEL_NAMES[current.level]}!`}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={close}>{isLast ? 'Genial' : 'Siguiente'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
