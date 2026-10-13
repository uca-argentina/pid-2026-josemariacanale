/** El rayado de un tramo bloqueado. */
export function BlockedTimeCell() {
    return (
        <div
            className="group absolute inset-0 flex h-full flex-col [--disabled-gradient-background:#E5E7EB] [--disabled-gradient-foreground:#D1D5DB] hover:cursor-not-allowed"
            style={{
                backgroundColor: '#D1D5DB',
                background:
                    'repeating-linear-gradient( -45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 6.5px )',
            }}
        />
    );
}
