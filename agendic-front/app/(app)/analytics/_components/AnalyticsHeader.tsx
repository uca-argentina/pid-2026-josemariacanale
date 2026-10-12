/**
 * El encabezado de Analíticas, como el de Insights de Cal.com: título y bajada y, abajo, una fila con el selector de
 * alcance y los filtros a la izquierda y el rango a la derecha. `filters` y `range` faltan hasta hidratar.
 */
export function AnalyticsHeader({ selector, filters, range }: { selector: React.ReactNode; filters?: React.ReactNode; range?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            <div>
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Analíticas</h1>
                <p className="m-0 text-sm text-muted-foreground">Mirá las analíticas de los Turnos de todos tus Servicios</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {selector}
                    {filters}
                </div>
                {range}
            </div>
        </div>
    );
}
