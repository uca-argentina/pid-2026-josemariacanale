import Link from 'next/link';
import type { CurrentUser } from '@/app/(public)/(auth)/current-user';
import { Button } from './ui/button';
import { Logo } from './Logo';
import { SignOutButton } from './SignOutButton';

export function Header({ user }: { user: CurrentUser | null }) {
    return (
        <header className="flex items-center justify-between px-16 py-5">
            <Link href="/">
                <Logo />
            </Link>
            <nav className="flex gap-8 text-[15px] font-medium text-foreground">
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
            <div className="flex items-center gap-2.5">
                {user ? (
                    <>
                        <span className="text-[15px] font-semibold text-foreground px-4 py-2.5">
                            {user.name}
                        </span>
                        <SignOutButton>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-[15px] font-semibold text-foreground px-4 py-2.5 hover:text-primary transition-colors h-auto"
                            >
                                Cerrar sesión
                            </Button>
                        </SignOutButton>
                    </>
                ) : (
                    <>
                        <Button
                            asChild
                            variant="ghost"
                            className="text-[15px] font-semibold text-foreground px-4 py-2.5 hover:text-primary transition-colors h-auto"
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
                            className="text-[15px] font-bold text-white bg-primary px-[18px] py-[11px] rounded-[10px] hover:bg-primary/90 transition-colors h-auto"
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
