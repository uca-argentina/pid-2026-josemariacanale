'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { BranchPhoto } from '@/app/_components/booking/BranchPhoto';
import { BranchGalleryViewer } from './BranchGalleryViewer';
import { galleryLayout, splitIntoRows, type GalleryRow } from './gallery-layout';
import type { BranchImage } from './types';

const TITLE = 'Galería de imágenes';

/** Cómo se ve cada fila según cuántas Imágenes lleva: una a todo el ancho, o dos a mitad cada una. */
const ROW_STYLE: Record<GalleryRow, { columns: string; aspect: string; sizes: string }> = {
    1: { columns: 'grid-cols-1', aspect: 'aspect-[16/9]', sizes: '(max-width: 1000px) 100vw, 1000px' },
    2: { columns: 'grid-cols-2', aspect: 'aspect-[4/3]', sizes: '(max-width: 1000px) 50vw, 500px' },
};

/** La X redonda que cierra el modal. */
function CloseButton() {
    return (
        <Dialog.Close
            aria-label="Cerrar galería"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-white hover:bg-muted"
        >
            <X className="size-5" />
        </Dialog.Close>
    );
}

/**
 * Modal blanco a pantalla completa con todas las Imágenes de la Sucursal, en las filas de `galleryLayout`: una a todo
 * el ancho y dos a mitad cada una, alternadas. Entra con fade y un deslizamiento corto desde abajo; se cierra con la X
 * o Esc. Cuando el título sale de vista al scrollear, aparece arriba un encabezado fijo con el título y la X. Tocar una
 * Imagen abre en ella la galería oscura, que al cerrarse vuelve a este modal.
 */
export function BranchGalleryModal({
    open,
    onOpenChange,
    businessName,
    branchName,
    images,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    businessName: string;
    branchName: string;
    images: BranchImage[];
}) {
    const [scrollerEl, setScrollerEl] = useState<HTMLElement | null>(null);
    const [titleEl, setTitleEl] = useState<HTMLElement | null>(null);
    const [titleVisible, setTitleVisible] = useState(true);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!scrollerEl || !titleEl) return;
        const observer = new IntersectionObserver(([entry]) => setTitleVisible(entry.isIntersecting), { root: scrollerEl });
        observer.observe(titleEl);
        return () => {
            observer.disconnect();
            setTitleVisible(true);
        };
    }, [scrollerEl, titleEl]);

    const rows = splitIntoRows(images, galleryLayout(images.length).modalRows);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Popup
                    ref={setScrollerEl}
                    className="group fixed inset-0 z-50 overflow-y-auto bg-white text-foreground outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
                >
                    <div
                        inert={titleVisible}
                        className={`fixed inset-x-0 top-0 z-10 border-b border-border bg-white transition-opacity duration-200 ${titleVisible ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
                    >
                        <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
                            <span className="text-[17px] font-extrabold tracking-[-0.02em]">{TITLE}</span>
                            <CloseButton />
                        </div>
                    </div>

                    <div className="mx-auto w-full max-w-[1000px] px-4 pt-6 pb-16 duration-200 group-data-open:animate-in group-data-open:slide-in-from-bottom-4 group-data-closed:animate-out group-data-closed:slide-out-to-bottom-4 sm:px-8">
                        <header className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <Dialog.Title
                                    ref={setTitleEl}
                                    className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[32px]"
                                >
                                    {TITLE}
                                </Dialog.Title>
                                <Dialog.Description className="mt-1 text-[14.5px] font-medium text-muted-foreground">
                                    {businessName} · Sucursal {branchName}
                                </Dialog.Description>
                            </div>
                            <CloseButton />
                        </header>

                        <ul className="mt-6 flex flex-col gap-2 sm:gap-3">
                            {rows.map((row, index) => {
                                const style = ROW_STYLE[row.length as GalleryRow];
                                return (
                                    <li key={index} className={`grid gap-2 sm:gap-3 ${style.columns}`}>
                                        {row.map((image) => {
                                            const index = images.indexOf(image);
                                            return (
                                            <button
                                                key={image.id}
                                                type="button"
                                                onClick={() => setViewerIndex(index)}
                                                aria-label={`Ver la foto ${index + 1} en grande`}
                                                className={`relative cursor-zoom-in overflow-hidden rounded-xl ${style.aspect}`}
                                            >
                                                <BranchPhoto src={image.url} sizes={style.sizes} />
                                            </button>
                                            );
                                        })}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <BranchGalleryViewer
                        startIndex={viewerIndex}
                        onClose={() => setViewerIndex(null)}
                        branchName={branchName}
                        images={images}
                    />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
