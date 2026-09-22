import Link from 'next/link';
import { Button } from '@/app/_components/ui/button';

export function PlaceholderView({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center gap-2.5 px-7 py-15 text-center">
            <div className="text-[16px] font-extrabold tracking-[-0.02em]">{title}</div>
            <div className="max-w-[380px] text-[13px] font-medium text-muted-foreground">
                Esta sección todavía no está maquetada.
            </div>
            <Button asChild className="mt-1.5 h-auto rounded-[10px] px-4 py-2 text-[13px] font-bold">
                <Link href="/turnos">Volver a Turnos</Link>
            </Button>
        </div>
    );
}
