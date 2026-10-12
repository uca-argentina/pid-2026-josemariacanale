import Link from 'next/link';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { BUSINESS_PATH } from '@/app/routes';

const FEATURES = [
    { icon: Users, title: 'Turnos por Empleado', description: 'Mirá quién atiende más Turnos y a quién se le cancelan.' },
    { icon: TrendingUp, title: 'Tendencias', description: 'Seguí cómo evolucionan las reservas, las cancelaciones y las ausencias.' },
    { icon: BarChart3, title: 'Servicios más reservados', description: 'Descubrí qué Servicios elige tu gente.' },
] as const;

/** Lo que ve quien no es Empleado de ningún Negocio en Analíticas: qué se gana con uno y el camino a Crear Negocio. */
export function NoBusinessHero() {
    return (
        <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10 text-center lg:px-6">
            <div className="flex max-w-xl flex-col items-center gap-3">
                <h1 className="m-0 text-3xl font-extrabold tracking-[-0.035em]">Tomá decisiones con tus analíticas</h1>
                <p className="m-0 text-muted-foreground">Creá un Negocio y mirá cómo rinde tu equipo: Turnos, tendencias y Servicios.</p>
                <Button render={<Link href={BUSINESS_PATH} />}>
                    Crear Negocio
                </Button>
            </div>
            <div className="grid w-full max-w-4xl grid-cols-1 gap-4 text-start @3xl/main:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, description }) => (
                    <Card key={title}>
                        <CardHeader>
                            <Icon className="mb-2 size-5 text-muted-foreground" aria-hidden />
                            <CardTitle>{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}
