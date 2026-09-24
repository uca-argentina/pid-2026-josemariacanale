'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Card } from '@/app/_components/ui/card';
import { Input } from '@/app/_components/ui/input';
import { Textarea } from '@/app/_components/ui/textarea';
import { Field } from '@/app/onboarding/_components/Field';
import { businessSchema, fieldErrorsOf, type BusinessFields, type FieldErrors } from '@/app/onboarding/_components/schemas';
import { updateBusinessAction } from '../actions';

export function BusinessForm({ business }: { business: BusinessFields & { id: number } }) {
    const { id } = business;
    const [values, setValues] = useState<BusinessFields>({
        name: business.name,
        description: business.description,
        slug: business.slug,
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState<string>();
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    const change = (patch: Partial<BusinessFields>) => {
        setValues({ ...values, ...patch });
        setSaved(false);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(undefined);
        setSaved(false);

        const result = businessSchema.safeParse(values);
        if (!result.success) {
            setErrors(fieldErrorsOf(result.error));
            return;
        }
        setErrors({});

        startTransition(async () => {
            const response = await updateBusinessAction({ id, ...result.data });
            if (response.ok) {
                const { name, description, slug } = response.business;
                setValues({ name, description, slug });
                setSaved(true);
            } else if (response.field === 'slug') setErrors({ slug: response.message });
            else setSubmitError(response.message);
        });
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <Card className="gap-5 p-6 [--card-spacing:0px]">
                <Field id="business-name" label="Nombre del Negocio" error={errors.name}>
                    <Input
                        id="business-name"
                        value={values.name}
                        onChange={(e) => change({ name: e.target.value })}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'business-name-error' : undefined}
                    />
                </Field>

                <Field id="business-description" label="Descripción" error={errors.description}>
                    <Textarea
                        id="business-description"
                        value={values.description}
                        onChange={(e) => change({ description: e.target.value })}
                        aria-invalid={Boolean(errors.description)}
                        aria-describedby={errors.description ? 'business-description-error' : undefined}
                    />
                </Field>

                <Field id="business-slug" label="Enlace de reserva" error={errors.slug}>
                    <div className="flex">
                        <span className="flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
                            agendic.com/
                        </span>
                        <Input
                            id="business-slug"
                            value={values.slug}
                            onChange={(e) => change({ slug: e.target.value })}
                            className="rounded-l-none"
                            aria-invalid={Boolean(errors.slug)}
                            aria-describedby={errors.slug ? 'business-slug-error' : undefined}
                        />
                    </div>
                    {values.slug !== business.slug && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Al cambiar el Enlace de reserva, los enlaces que ya compartiste dejan de funcionar.
                        </p>
                    )}
                </Field>

                {submitError && (
                    <p role="alert" className="text-sm text-destructive">
                        {submitError}
                    </p>
                )}
                {saved && (
                    <p role="status" className="text-sm text-muted-foreground">
                        Cambios guardados.
                    </p>
                )}

                <Button type="submit" size="lg" disabled={isPending}>
                    {isPending ? 'Guardando…' : 'Guardar cambios'}
                </Button>
            </Card>
        </form>
    );
}
