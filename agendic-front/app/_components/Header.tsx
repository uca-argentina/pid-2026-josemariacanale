import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { CurrentUser } from '@/app/(public)/(auth)/current-user';
import { SIGNED_IN_HOME_PATH } from '@/app/routes';
import { Button } from './ui/button';
import { Logo } from './Logo';

// `nav` son los enlaces de la landing; la página pública de un Negocio usa el mismo Header sin ellos.
export function Header({ user, nav = true }: { user: CurrentUser | null; nav?: boolean }) {
    return (
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-16">
            <Link href="/">
                <Logo />
            </Link>
            {nav && (
                <nav className="hidden gap-8 text-[15px] font-medium text-foreground md:flex">
                    <Link href="#" className="hover:text-primary transition-colors">
                        Funcionalidades
                    </Link>
                    <Link href="#" className="hover:text-primary transition-colors">
                        Rubros
                    </Link>
                    <Link href="#" className="hover:text-primary transition-colors">
                        Preguntas frecuentes
                    </Link>
                </nav>
            )}
            <div className="flex items-center gap-2.5">
                {user ? (
                    <>
                        <span className="hidden text-[15px] font-semibold text-foreground px-4 py-2.5 sm:inline">
                            {user.name}
                        </span>
                        <Button
                            asChild
                            className="text-[14px] font-bold text-white bg-primary px-3.5 py-2 rounded-[10px] hover:bg-primary/90 transition-colors h-auto sm:px-[18px] sm:py-[11px] sm:text-[15px]"
                        >
                            <Link href={SIGNED_IN_HOME_PATH}>
                                Ir a la app
                                <ChevronRight />
                            </Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            asChild
                            variant="ghost"
                            className="hidden text-[15px] font-semibold text-foreground px-4 py-2.5 hover:text-primary transition-colors h-auto sm:inline-flex"
                        >
                            <Link
                                href="/sign-in"
                                transitionTypes={['auth-nav']}
                            >
                                Ir a mi cuenta
                            </Link>
                        </Button>
                        <Button
                            asChild
                            className="text-[14px] font-bold text-white bg-primary px-3.5 py-2 rounded-[10px] hover:bg-primary/90 transition-colors h-auto sm:px-[18px] sm:py-[11px] sm:text-[15px]"
                        >
                            <Link
                                href="/sign-up"
                                transitionTypes={['auth-nav']}
                            >
                                Empezá gratis
                            </Link>
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
}
