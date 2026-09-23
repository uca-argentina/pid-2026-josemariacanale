export function StepHeader({
    title,
    subtitle,
    step,
    total,
}: {
    title: string;
    subtitle: string;
    step: number;
    total: number;
}) {
    return (
        <header className="flex flex-col gap-2">
            <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-foreground">
                {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            <p className="mt-2 text-xs text-muted-foreground">
                Paso {step} de {total}
            </p>
            <ol className="flex gap-1.5" aria-label={`Paso ${step} de ${total}`}>
                {Array.from({ length: total }, (_, i) => (
                    <li
                        key={i}
                        aria-current={i + 1 === step ? 'step' : undefined}
                        className={`h-[3px] w-12 rounded-full ${
                            i < step ? 'bg-primary' : 'bg-border'
                        }`}
                    />
                ))}
            </ol>
        </header>
    );
}
