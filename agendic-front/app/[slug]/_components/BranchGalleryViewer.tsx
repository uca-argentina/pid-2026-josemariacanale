'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import Image from 'next/image';
import { X } from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from '@/app/_components/ui/carousel';
import { slideCounter } from './gallery-layout';
import type { BranchImage } from './types';

/** Las flechas: blancas y redondas; con mouse aparecen al pasar sobre la foto, sin hover siempre se ven. */
const ARROW =
    'border-0 bg-white text-black shadow-md hover:bg-white/90 disabled:hidden opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/photo:opacity-100 focus-visible:opacity-100';

/** El contenido de la galería abierta; se monta en cada apertura, así arranca en la Imagen tocada. */
function ViewerBody({ initialIndex, branchName, images }: { initialIndex: number; branchName: string; images: BranchImage[] }) {
    const [startIndex] = useState(initialIndex);
    const [api, setApi] = useState<CarouselApi>();
    const [selected, setSelected] = useState(initialIndex);

    useEffect(() => {
        if (!api) return;
        const sync = () => setSelected(api.selectedScrollSnap());
        api.on('select', sync);
        return () => {
            api.off('select', sync);
        };
    }, [api]);

    useEffect(() => {
        if (!api) return;
        const navigate = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            if (event.key === 'ArrowLeft') api.scrollPrev();
            else if (event.key === 'ArrowRight') api.scrollNext();
        };
        document.addEventListener('keydown', navigate);
        return () => document.removeEventListener('keydown', navigate);
    }, [api]);

    return (
        <Carousel
            opts={{ loop: false, startIndex }}
            setApi={setApi}
            className="flex h-full flex-col"
            aria-label={`Fotos de la Sucursal ${branchName}`}
        >
            <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-8">
                <Dialog.Title className="m-0 truncate text-[16px] font-bold">{branchName}</Dialog.Title>
                <span aria-live="polite" className="text-[14px] font-semibold tabular-nums text-white/80">
                    {slideCounter(selected, images.length)}
                </span>
                <Dialog.Close
                    aria-label="Cerrar galería"
                    className="flex size-10 items-center justify-center justify-self-end rounded-full bg-white/10 hover:bg-white/20"
                >
                    <X className="size-5" />
                </Dialog.Close>
            </header>

            <div className="group/photo relative min-h-0 flex-1 px-4 pb-6 sm:px-20">
                <CarouselContent>
                    {images.map((image, index) => (
                        <CarouselItem key={image.id} className="flex h-[calc(100dvh-5.5rem)] items-center justify-center">
                            <Image
                                src={image.url}
                                alt={`Foto ${index + 1} de la Sucursal ${branchName}`}
                                width={0}
                                height={0}
                                sizes="100vw"
                                unoptimized
                                priority={index === startIndex}
                                draggable={false}
                                className="h-auto max-h-full w-auto max-w-full rounded-2xl select-none"
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious variant="secondary" size="icon-xl" aria-label="Foto anterior" className={`left-4 sm:left-6 ${ARROW}`} />
                <CarouselNext variant="secondary" size="icon-xl" aria-label="Foto siguiente" className={`right-4 sm:right-6 ${ARROW}`} />
            </div>
        </Carousel>
    );
}

/**
 * Galería oscura a pantalla completa, abierta en la Imagen `startIndex`: arriba el nombre de la Sucursal, el contador
 * "n/N" y la X; las Imágenes se deslizan en horizontal con las flechas, ←/→ o swipe, sin dar la vuelta. Esc o la X la
 * cierran y vuelven al modal de la galería, que queda abierto debajo.
 */
export function BranchGalleryViewer({
    startIndex,
    onClose,
    branchName,
    images,
}: {
    /** La Imagen en la que abre; `null` la deja cerrada. */
    startIndex: number | null;
    onClose: () => void;
    branchName: string;
    images: BranchImage[];
}) {
    return (
        <Dialog.Root open={startIndex !== null} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Popup className="fixed inset-0 z-[60] bg-[#0b0b0c] text-white outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
                    <ViewerBody initialIndex={startIndex ?? 0} branchName={branchName} images={images} />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
