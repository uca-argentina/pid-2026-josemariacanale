import { Building2, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <header className="flex flex-wrap items-center gap-4 border-b border-border bg-white px-7 py-4">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">{title}</h1>
                {subtitle && <p className="m-0 text-[13px] font-medium text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="ml-auto flex items-center gap-2.5">
                <Button variant="outline" className="h-auto gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-foreground">
                    <Building2 className="size-[15px] text-muted-foreground" />
                    Sucursal Centro
                    <ChevronDown className="size-[13px] text-muted-foreground" />
                </Button>
                <Button className="h-auto gap-1.5 rounded-[10px] px-[15px] py-2 text-[13px] font-bold shadow-[0_8px_20px_rgba(45,91,255,0.24)]">
                    <Plus className="size-[15px]" />
                    Nuevo turno
                </Button>
            </div>
        </header>
    );
}
