import { Award, CalendarCheck, CircleCheckBig, Flame, HeartHandshake, Star, type LucideIcon } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import type { BadgeLevel } from '@/src/entities/models/badge';
import { LEVEL_GRADIENTS, LOCKED_GRADIENT, medalLabel } from './medal-style';

const ICONS: Record<string, LucideIcon> = {
    'first-booking': CalendarCheck,
    attended: CircleCheckBig,
    'five-stars': Star,
    'loyal-clients': HeartHandshake,
    'always-present': Flame,
};

const SIZES = {
    sm: { circle: 'size-7', icon: 'size-3.5' },
    lg: { circle: 'size-16', icon: 'size-8' },
};

/**
 * La medalla de una Insignia en un Nivel: el ícono de la Insignia sobre un círculo con el gradiente del Nivel.
 * Con `level` null la Insignia no ganó ninguno y se ve apagada. `sm` es para tablas; `lg` para Logros, el Sheet y el modal.
 * Una Insignia fuera del catálogo del front usa un ícono genérico.
 */
export function Medal({
    badge,
    name,
    level,
    size = 'lg',
    className,
}: {
    badge: string;
    name: string;
    level: BadgeLevel | null;
    size?: keyof typeof SIZES;
    className?: string;
}) {
    const Icon = ICONS[badge] ?? Award;
    return (
        <span
            role="img"
            aria-label={medalLabel(name, level)}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-sm',
                SIZES[size].circle,
                level ? LEVEL_GRADIENTS[level] : LOCKED_GRADIENT,
                className,
            )}
        >
            <Icon aria-hidden className={SIZES[size].icon} />
        </span>
    );
}
