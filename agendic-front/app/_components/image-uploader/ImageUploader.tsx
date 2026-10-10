'use client';

import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { IMAGE_ACCEPT, takeUpToLimit } from './limit';

/** Una imagen del cargador: ya en el back, o un archivo en memoria con su vista previa local. */
export type UploaderImage = { id: string | number; url: string; uploading?: boolean };

type Props = {
    images: UploaderImage[];
    /** Tope de imágenes: 5 para una Sucursal, 1 para el Logo del Negocio. */
    max: number;
    /** Si se pueden reordenar arrastrando. */
    reorderable?: boolean;
    /** Recibe los archivos que entran bajo el tope. */
    onUpload: (files: File[]) => void;
    onDelete: (id: UploaderImage['id']) => void;
    /** Recibe los ids en el orden nuevo. Si rechaza, el cargador vuelve al orden anterior y avisa con un toast. */
    onReorder?: (ids: UploaderImage['id'][]) => void | Promise<void>;
};

function Card({ image, reorderable, onDelete }: { image: UploaderImage; reorderable: boolean; onDelete: Props['onDelete'] }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: image.id,
        disabled: !reorderable,
    });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted ${isDragging ? 'z-10 shadow-lg' : ''}`}
            {...attributes}
            {...listeners}
        >
            {/* eslint-disable-next-line @next/next/no-img-element -- external storage; previews are blob: URLs */}
            <img src={image.url} alt="" className="size-full object-cover" draggable={false} />
            {image.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="size-5 animate-spin" aria-label="Subiendo" />
                </div>
            )}
            <button
                type="button"
                aria-label="Borrar imagen"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={() => onDelete(image.id)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

/**
 * Cargador de imágenes con tarjetas cuadradas: "Subir" fija a la izquierda y las imágenes a su derecha, que
 * scrollean en X cuando no entran. No sabe de la API: `onUpload`, `onDelete` y `onReorder` sirven tanto para
 * imágenes ya en el back como para archivos en memoria.
 */
export function ImageUploader({ images, max, reorderable = false, onUpload, onDelete, onReorder }: Props) {
    const input = useRef<HTMLInputElement>(null);
    // Orden optimista mientras el PUT está en vuelo.
    const [pending, setPending] = useState<UploaderImage['id'][] | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const shown = pending ? pending.map((id) => images.find((i) => i.id === id)).filter((i): i is UploaderImage => !!i) : images;
    const full = images.length >= max;

    function pick(list: FileList | null) {
        const { accepted, dropped } = takeUpToLimit(Array.from(list ?? []), max, images.length);
        if (input.current) input.current.value = '';
        if (dropped > 0) toast.error(`Solo entran ${max} imágenes: ${dropped} quedaron afuera`);
        if (accepted.length) onUpload(accepted);
    }

    async function onDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id || !onReorder) return;
        const ids = shown.map((i) => i.id);
        const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
        setPending(next);
        try {
            await onReorder(next);
        } catch {
            toast.error('No se pudo guardar el orden de las imágenes');
        } finally {
            setPending(null);
        }
    }

    return (
        <div className="flex items-stretch gap-2">
            <button
                type="button"
                disabled={full}
                onClick={() => input.current?.click()}
                className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Plus className="size-5" />
                Subir
            </button>
            <input
                ref={input}
                type="file"
                multiple={max > 1}
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => pick(e.target.files)}
            />
            <div className="flex min-w-0 gap-2 overflow-x-auto">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={shown.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                        {shown.map((image) => (
                            <Card key={image.id} image={image} reorderable={reorderable} onDelete={onDelete} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
