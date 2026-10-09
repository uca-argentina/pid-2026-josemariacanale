import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/_components/ui/card';

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// No "Clientes nuevos": each Turno has its own Cliente (CONTEXT.md), so there is no new or returning one to count.
const KPIS = [
    { title: 'Ingresos del mes', value: ars.format(1_250_000), trend: '+12,5%', up: true, footer: 'En alza este mes', detail: 'De los Turnos aceptados' },
    { title: 'Turnos del mes', value: '1.234', trend: '−20%', up: false, footer: 'En baja este período', detail: 'Menos Turnos que el mes pasado' },
    { title: 'Tasa de Ausencias', value: '3,2%', trend: '−0,8%', up: false, footer: 'Menos Ausencias', detail: 'Sobre los Turnos aceptados ya pasados' },
    { title: 'Ocupación', value: '78%', trend: '+4,5%', up: true, footer: 'Rendimiento estable', detail: 'De los Horarios reservables tomados' },
];

/** Las tarjetas KPI de Analíticas: 1, 2 o 4 columnas según el ancho de `@container/main`. */
export function SectionCards() {
    return (
        <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {KPIS.map(({ title, value, trend, up, footer, detail }) => {
                const Trend = up ? TrendingUp : TrendingDown;
                return (
                    <Card key={title} className="@container/card">
                        <CardHeader>
                            <CardDescription>{title}</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
                            <CardAction>
                                <Badge variant="outline" className="gap-1">
                                    <Trend className="size-3" />
                                    {trend}
                                </Badge>
                            </CardAction>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1.5 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                {footer} <Trend className="size-4" />
                            </div>
                            <div className="text-muted-foreground">{detail}</div>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}
