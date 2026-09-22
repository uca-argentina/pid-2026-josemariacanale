import { cn } from '@/app/_components/utils';

// `bold` fills more of the square (reads better small, in UI); `padded` leaves more air (favicon).
const CHECKS = {
    bold: { d: 'M28 50 L44 65 L70 33', strokeWidth: 8 },
    padded: { d: 'M33 52 L45.5 64.5 L67 40', strokeWidth: 7 },
};

// The square takes `currentColor`, so callers (and app/icon.tsx, where Tailwind doesn't apply) set its color.
export function LogoMark({
    size = 28,
    variant = 'bold',
    className,
}: {
    size?: number;
    variant?: keyof typeof CHECKS;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 96 96"
            aria-hidden="true"
            className={cn('block shrink-0 text-foreground', className)}
        >
            <rect width="96" height="96" rx="20" fill="currentColor" />
            <path
                {...CHECKS[variant]}
                stroke="#FFFFFF"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function LogoWordmark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'whitespace-nowrap text-[22px] leading-none font-extrabold tracking-[-0.02em] text-foreground [text-box:trim-both_cap_alphabetic]',
                className,
            )}
        >
            agendic<span className="text-primary">.</span>
        </span>
    );
}

export function Logo({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-2 leading-none', className)}>
            <LogoMark />
            <LogoWordmark />
        </span>
    );
}
