'use client';

import { PanelField, PanelInput, PanelTextarea } from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/mock-services';
import type { BusinessFields, FieldErrors } from '@/app/_components/business-schemas';

/** Nombre, descripción y Enlace de reserva: el paso 1 de Crear Negocio y el modal de Editar negocio. */
export function BusinessFieldset({
    value,
    onChange,
    errors,
    slugHint,
}: {
    value: BusinessFields;
    onChange: (patch: Partial<BusinessFields>) => void;
    errors: FieldErrors;
    slugHint?: string;
}) {
    const invalid = (field: string, id: string) =>
        errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {};

    return (
        <>
            <PanelField label="Nombre del Negocio" htmlFor="business-name" error={errors.name}>
                <PanelInput
                    id="business-name"
                    placeholder="Estudio Belgrano"
                    value={value.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    {...invalid('name', 'business-name')}
                />
            </PanelField>
            <PanelField label="Descripción" htmlFor="business-description" error={errors.description}>
                <PanelTextarea
                    id="business-description"
                    placeholder="Contales a tus Clientes qué hace tu Negocio."
                    value={value.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    {...invalid('description', 'business-description')}
                />
            </PanelField>
            <PanelField label="Enlace de reserva" htmlFor="business-slug" hint={slugHint} error={errors.slug}>
                <PanelInput
                    id="business-slug"
                    prefix={bookingLink('')}
                    placeholder="estudio-belgrano"
                    value={value.slug}
                    onChange={(e) => onChange({ slug: e.target.value })}
                    {...invalid('slug', 'business-slug')}
                />
            </PanelField>
        </>
    );
}
