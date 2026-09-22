export function BenefitsStrip() {
    return (
        <div className="grid grid-cols-3 gap-0 border-t border-border mx-16 pt-10 pb-14">
            <div className="pr-8">
                <div className="text-[18px] font-bold mb-1.5 text-foreground">
                    Menos llamadas y WhatsApp
                </div>
                <div className="text-[15px] text-muted-foreground leading-[1.5]">
                    Tus clientes reservan solos, a cualquier hora, sin
                    interrumpirte.
                </div>
            </div>
            <div className="px-8 border-l border-border">
                <div className="text-[18px] font-bold mb-1.5 text-foreground">
                    Menos ausencias
                </div>
                <div className="text-[15px] text-muted-foreground leading-[1.5]">
                    Recordatorios automáticos y confirmación de asistencia antes
                    de cada turno.
                </div>
            </div>
            <div className="pl-8 border-l border-border">
                <div className="text-[18px] font-bold mb-1.5 text-foreground">
                    Agenda siempre al día
                </div>
                <div className="text-[15px] text-muted-foreground leading-[1.5]">
                    Cada turno nuevo, cambio o cancelación se refleja al
                    instante en todas tus sucursales.
                </div>
            </div>
        </div>
    );
}
