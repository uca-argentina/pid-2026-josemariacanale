'use client';

import { PanelField, PanelInput, PanelTextarea } from '@/app/(app)/_components/panel-ui';
import { TimeZoneCombobox } from '@/app/(app)/_components/TimeZoneCombobox';
import { bookingLink } from '@/app/(app)/_components/mock-services';
import type { BranchFormFields as Fields, FieldErrors } from '@/app/_components/business-schemas';

/** Los campos de una Sucursal, para editarla en su tarjeta y para crearla en el modal. `idPrefix` evita ids repetidos entre tarjetas. */
export function BranchFormFields({
    idPrefix,
    businessSlug,
    value,
    onChange,
    errors,
}: {
    idPrefix: string;
    businessSlug: string;
    value: Fields;
    onChange: (patch: Partial<Fields>) => void;
    errors: FieldErrors;
}) {
    const id = (field: string) => `${idPrefix}-${field}`;
    const invalid = (field: string) => (errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id(field)}-error` } : {});

    return (
        <>
            <PanelField label="Nombre de la Sucursal" htmlFor={id('name')} error={errors.name}>
                <PanelInput id={id('name')} value={value.name} onChange={(e) => onChange({ name: e.target.value })} {...invalid('name')} />
            </PanelField>
            <PanelField label="Enlace de reserva" htmlFor={id('slug')} error={errors.slug}>
                <PanelInput
                    id={id('slug')}
                    prefix={`${bookingLink(businessSlug)}/`}
                    value={value.slug}
                    onChange={(e) => onChange({ slug: e.target.value })}
                    {...invalid('slug')}
                />
            </PanelField>
            <PanelField
                label="Descripción"
                htmlFor={id('description')}
                hint="Opcional. Reemplaza a la del Negocio en la página de la Sucursal."
                error={errors.description}
            >
                <PanelTextarea id={id('description')} value={value.description} onChange={(e) => onChange({ description: e.target.value })} />
            </PanelField>
            <PanelField label="Dirección" htmlFor={id('address')} error={errors.address}>
                <PanelInput id={id('address')} value={value.address} onChange={(e) => onChange({ address: e.target.value })} {...invalid('address')} />
            </PanelField>
            <PanelField label="Zona horaria" htmlFor={id('timeZone')} error={errors.timeZone}>
                <TimeZoneCombobox id={id('timeZone')} value={value.timeZone} onChange={(timeZone) => onChange({ timeZone })} />
            </PanelField>
        </>
    );
}
