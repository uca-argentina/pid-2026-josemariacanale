'use client';

import { usePathname } from 'next/navigation';
import { Separator } from '@/app/_components/ui/separator';
import { SidebarTrigger } from '@/app/_components/ui/sidebar';
import { sectionOf } from '@/app/routes';
import type { NavItem } from './types';

/** La barra superior del panel: el botón del sidebar y el nombre de la sección. El `<h1>` sigue siendo de cada página. */
export function SiteHeader({ sections }: { sections: NavItem[] }) {
    const section = sectionOf(usePathname(), sections);

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                {section ? <p className="m-0 text-sm font-semibold">{section.label}</p> : null}
            </div>
        </header>
    );
}
