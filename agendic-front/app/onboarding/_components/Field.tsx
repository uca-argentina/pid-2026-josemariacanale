import { Label } from '@/app/_components/ui/label';

export function Field({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </div>
            {children}
            {error && (
                <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
