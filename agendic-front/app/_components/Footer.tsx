import Link from 'next/link';
import { Globe, ChevronDown } from 'lucide-react';

export function Footer() {
    return (
        <footer className="flex items-center justify-between gap-4 px-16 py-5 flex-wrap">
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-muted-foreground cursor-pointer">
                <Globe className="size-4" />
                <span>Español</span>
                <ChevronDown className="size-3" />
            </div>
            <nav className="flex gap-7 flex-wrap">
                <Link
                    href="#"
                    className="text-[13.5px] text-muted-foreground hover:text-primary transition-colors"
                >
                    Política de privacidad
                </Link>
                <Link
                    href="#"
                    className="text-[13.5px] text-muted-foreground hover:text-primary transition-colors"
                >
                    Legal
                </Link>
                <Link
                    href="#"
                    className="text-[13.5px] text-muted-foreground hover:text-primary transition-colors"
                >
                    Estado del servicio
                </Link>
                <Link
                    href="#"
                    className="text-[13.5px] text-muted-foreground hover:text-primary transition-colors"
                >
                    Configuración de cookies
                </Link>
            </nav>
            <div className="text-[13px] text-muted-foreground">
                © Agendic 2026
            </div>
        </footer>
    );
}
