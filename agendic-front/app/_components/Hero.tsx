import Link from 'next/link';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function Hero() {
    return (
        <div className="text-center pt-14 px-16 pb-0">
            <Badge className="inline-flex text-[13px] font-semibold text-primary bg-secondary px-3 py-1.5 rounded-full mb-5 hover:bg-secondary border-0">
                Agenda online para negocios de servicios
            </Badge>
            <h1 className="text-[60px] leading-[1.05] tracking-[-0.03em] font-extrabold text-foreground mx-auto mb-5 max-w-[16ch]">
                Turnos online para clínicas, spas, gimnasios y academias.
            </h1>
            <p className="text-[20px] leading-[1.5] text-muted-foreground mx-auto mb-8 max-w-[48ch]">
                Organizá tu agenda, reducí las ausencias y dejá de atender
                turnos por WhatsApp.
            </p>
            <div className="flex justify-center gap-3 mb-3.5">
                <Button
                    asChild
                    className="text-[16px] font-bold text-white bg-primary px-[26px] py-[15px] rounded-xl hover:bg-primary/90 transition-colors h-auto border-0"
                >
                    <Link href="#">Empezá gratis</Link>
                </Button>
                <Button
                    asChild
                    variant="outline"
                    className="text-[16px] font-semibold text-foreground bg-white border-[1.5px] border-[#d6dbe6] px-[26px] py-[15px] rounded-xl hover:bg-gray-50 transition-colors h-auto"
                >
                    <Link href="#">Ver funcionalidades</Link>
                </Button>
            </div>
            <div className="text-[14px] text-[#6b7587]">
                Web y app móvil, para vos y para tus clientes.
            </div>
        </div>
    );
}
