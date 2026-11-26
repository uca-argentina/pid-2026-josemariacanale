# Guía: un front mínimo para tu feature

Para resolver una consigna (Reclamos, Ofertas de turno liberado, Agenda, etc.) cuando **el back ya está hecho** y
necesitás pantallas que lo llamen. Es lo más precario que funciona: sin `src/`, sin casos de uso, sin
controllers, sin Zod. Solo tres cosas por feature:

| Archivo | Qué hace | Corre en |
|---|---|---|
| `page.tsx` | Pide datos al back (GET) y los muestra | Servidor |
| `actions.ts` | Manda cambios al back (POST/PUT/PATCH/DELETE) | Servidor |
| Un componente de `app/_components/quick/` | Botón, formulario o tabla que usa esos datos y acciones | Navegador (casi todos) |

Los componentes visuales chicos (`Button`, `Card`, `Badge`...) son de [coss ui](https://coss.com/ui) y ya están en
`app/_components/ui/`. Los de `quick/` están armados encima de esos.

> **Por qué todo pasa por el servidor:** el token de la Sesión y `API_URL` viven en el servidor de Next. Si
> llamás al back con `fetch` desde un componente `'use client'`, no tenés ninguno de los dos. Regla: **el
> navegador nunca llama al back; llama a una Server Action, y la acción llama al back.**

---

## 0. Las piezas

### Qué hay en `app/_components/quick/`

| Componente | Para qué | Se configura con |
|---|---|---|
| [`back()`](#back--el-único-fetch-al-back) (`_components/back.ts`) | Llamar al back desde el servidor | método, ruta, `body`, `auth` |
| [`ActionButton`](#actionbutton--un-botón-que-hace-algo) | Aceptar, cancelar, borrar: una acción sin datos | `disabledReason`, `confirm`, `successMessage`, `refreshOnError` |
| [`JsonForm`](#jsonform--un-formulario-armado-con-json) | Cualquier formulario, con validación, armado con una lista de campos en JSON | `fields`, `action` o `toUrl`, `review` |
| [`FormDialog`](#formdialog--el-mismo-formulario-dentro-de-un-modal) | El mismo formulario, dentro de un modal | lo mismo + `trigger`, `title` |
| [`DataTable`](#datatable--una-tabla-con-estado-vacío) | Tabla con estado vacío, armada con una lista de columnas | `rows`, `columns`, `empty` |
| [`Countdown` / `Expiring`](#countdown-y-expiring--cuentas-regresivas) | Cuenta regresiva; esconder algo cuando vence | `until` |
| [`ErrorAlert`](#erroralert-y-datests--atajos) | El cartel rojo con el mensaje del back | `message`, `title` |
| [`dates.ts`](#erroralert-y-datests--atajos) | Fechas en hora argentina: `ymd`, `addDays`, `fmtDateTime`, `fmtTime`, `fmtMoney` | — |
| `TextForm` / `TextDialog` | Un solo texto (los de Reclamos). Siguen andando; `JsonForm` con un campo hace lo mismo | — |

Todos devuelven o reciben un `BackResult`: si el back responde con error, el componente muestra **el mensaje del
back tal cual**. Por eso la validación de negocio va en el back, y el front solo la muestra.

Si tu rama no las tiene, copialas de esta guía (el código completo está abajo) a
`agendic-front/app/_components/quick/` y `agendic-front/app/_components/back.ts`.

### `back()` — el único `fetch` al back

`app/_components/back.ts`

```ts
import { getInjection } from '@/di/container';

/** Lo que devuelve `back()`: los datos, o el status y el mensaje que mandó el back. */
export type BackResult<T = unknown> = { ok: true; data: T } | { ok: false; status: number; message: string };

/**
 * Llama al back desde el servidor (Server Component o Server Action). Nunca tira: devuelve `ok: false` con el
 * `message` del back, así la pantalla lo puede mostrar tal cual. Con `auth: true` manda el token de la Sesión.
 */
export async function back<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    { body, auth = false }: { body?: unknown; auth?: boolean } = {},
): Promise<BackResult<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) headers.Authorization = `Bearer ${await getInjection('IAuthenticationService').getAccessToken()}`;

    let response: Response;
    try {
        response = await fetch(`${process.env.API_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (cause) {
        console.error(`${method} ${path} failed`, cause);
        return { ok: false, status: 0, message: 'No se pudo conectar con el back. ¿Está levantado?' };
    }

    const json = await response.json().catch(() => undefined);
    if (!response.ok) {
        const message = json?.message ?? `${method} ${path} respondió ${response.status}`;
        return { ok: false, status: response.status, message: Array.isArray(message) ? message.join(', ') : String(message) };
    }
    return { ok: true, data: json as T };
}
```

```ts
await back('GET', `/claims/${link}`);                                    // público: el enlace es la credencial
await back('GET', '/claims', { auth: true });                            // con Sesión (endpoint con ClerkGuard)
await back('PUT', `/claims/${id}`, { body: { response }, auth: true });  // con cuerpo
```

Si el endpoint del back tiene `@UseGuards(ClerkGuard)`, poné `auth: true`. Si no, no.

### `ActionButton` — un botón que hace algo

`app/_components/quick/ActionButton.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { BackResult } from '@/app/_components/back';
import { Button, type ButtonProps } from '@/app/_components/ui/button';

/**
 * Un botón que corre una Server Action sin datos (aceptar, cancelar, borrar) y recarga la página si salió bien.
 *
 * - `disabledReason`: si viene, el botón queda deshabilitado y el motivo se ve debajo.
 * - `confirm`: si viene, pregunta antes de correr la acción (por ejemplo, "¿Cancelar? Perdés la seña").
 * - `successMessage`: si viene, avisa en un toast que salió bien (montá `<AppToaster />` en la página).
 * - `refreshOnError`: si el back rechaza, además de mostrar el error, recarga la página y lo avisa en un toast
 *   (para cuando el error cambia lo que hay que mostrar, como una oferta vencida que tiene que desaparecer).
 */
export function ActionButton({
    action,
    children,
    variant,
    size,
    disabledReason,
    confirm,
    successMessage,
    refreshOnError = false,
}: {
    action: () => Promise<BackResult>;
    children: React.ReactNode;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    disabledReason?: string | null;
    confirm?: string;
    successMessage?: string;
    refreshOnError?: boolean;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function run() {
        if (confirm && !window.confirm(confirm)) return;
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (result.ok) {
                if (successMessage) toast.success(successMessage);
                return router.refresh();
            }
            setError(result.message);
            if (refreshOnError) {
                toast.error(result.message);
                router.refresh();
            }
        });
    }

    return (
        <div className="flex flex-col gap-1">
            <Button variant={variant} size={size} loading={pending} disabled={!!disabledReason} onClick={run}>
                {children}
            </Button>
            {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
```

```tsx
<ActionButton action={aceptar.bind(null, link)}>Aceptar</ActionButton>

// Deshabilitado con el motivo a la vista (Agenda: "no se puede marcar no presentado un turno que no empezó")
<ActionButton action={noPresentado.bind(null, id)} disabledReason={empezo ? null : 'Todavía no empezó'}>
    No presentado
</ActionButton>

// Pregunta antes, y avisa con un toast
<ActionButton action={cancelar.bind(null, link)} variant="destructive-outline"
    confirm="¿Cancelar? Perdés la seña" successMessage="Turno cancelado">
    Cancelar
</ActionButton>

// Si el back rechaza, recarga la página (por ejemplo, una oferta vencida que tiene que desaparecer)
<ActionButton action={aceptarOferta.bind(null, link)} refreshOnError>Aceptar</ActionButton>
```

Variantes de `Button`: `default`, `outline`, `secondary`, `ghost`, `destructive`, `destructive-outline`, `link`.

> `successMessage` y `refreshOnError` muestran un toast: la página tiene que tener `<AppToaster />` (de
> `@/app/_components/AppToaster`). Las de `app/(app)/` ya lo tienen en el layout; las públicas lo agregan arriba del
> `<main>`.

### `JsonForm` — un formulario armado con JSON

`app/_components/quick/JsonForm.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { BackResult } from '@/app/_components/back';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';

/** Una regla con su mensaje de error. */
export type Rule<T> = { value: T; message: string };

/**
 * Un campo del formulario. Todo es JSON (sin funciones), así lo podés armar en un `page.tsx` del servidor.
 *
 * Las reglas de `min`/`max` comparan números en `type: 'number'` y texto en el resto (`'YYYY-MM-DD'` y `'HH:mm'` se
 * ordenan bien como texto). En fechas, `'today'` es el día de hoy.
 */
export type Field = {
    name: string;
    label?: string;
    type?: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'time' | 'textarea' | 'select' | 'checkbox' | 'hidden';
    placeholder?: string;
    defaultValue?: string | number | boolean;
    /** Solo `type: 'select'`. */
    options?: { value: string | number; label: string }[];
    /** Texto chico debajo del campo. */
    hint?: string;
    /** El mensaje si queda vacío (o sin tildar, en un checkbox). Sin esto, el campo es opcional. */
    required?: string;
    min?: Rule<number | string>;
    max?: Rule<number | string>;
    minLength?: Rule<number>;
    maxLength?: Rule<number>;
    /** Una expresión regular, como texto: `'^[A-Z0-9]{8}$'`. */
    pattern?: Rule<string>;
    /** Este campo no puede ser menor que el campo `value` (por ejemplo, `hasta` no antes de `desde`). */
    notBefore?: Rule<string>;
    /** Del campo `field` a este (dos fechas) no puede haber más de `days` días, contando los dos extremos. */
    maxDaysAfter?: { field: string; days: number; message: string };
};

/** Lo que recibe la acción: número en `number`, booleano en `checkbox`, texto en el resto. Los vacíos no viajan. */
export type FormValues = Record<string, string | number | boolean>;

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en la zona del navegador

function readValues(fields: Field[], form: FormData): FormValues {
    const values: FormValues = {};
    for (const field of fields) {
        if (field.type === 'checkbox') {
            values[field.name] = form.get(field.name) === 'on';
            continue;
        }
        const raw = String(form.get(field.name) ?? '').trim();
        if (raw === '') continue;
        values[field.name] = field.type === 'number' ? Number(raw) : raw;
    }
    return values;
}

/** El primer error de cada campo; vacío si está todo bien. */
function validate(fields: Field[], values: FormValues): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const field of fields) {
        const value = values[field.name];
        const fail = (message: string) => (errors[field.name] ??= message);
        const bound = (v: number | string) => (v === 'today' ? today() : v);

        if (value === undefined || value === false) {
            if (field.required) fail(field.required);
            continue;
        }
        if (field.min && value < bound(field.min.value)) fail(field.min.message);
        if (field.max && value > bound(field.max.value)) fail(field.max.message);
        if (field.minLength && String(value).length < field.minLength.value) fail(field.minLength.message);
        if (field.maxLength && String(value).length > field.maxLength.value) fail(field.maxLength.message);
        if (field.pattern && !new RegExp(field.pattern.value).test(String(value))) fail(field.pattern.message);
        if (field.notBefore) {
            const other = values[field.notBefore.value];
            if (other !== undefined && value < other) fail(field.notBefore.message);
        }
        if (field.maxDaysAfter) {
            const other = values[field.maxDaysAfter.field];
            const days = (Date.parse(String(value)) - Date.parse(String(other))) / 86_400_000 + 1;
            if (other !== undefined && days > field.maxDaysAfter.days) fail(field.maxDaysAfter.message);
        }
    }
    return errors;
}

/** Cómo se ve un valor en el paso de revisión: la etiqueta de la opción en un select, Sí/No en un checkbox. */
function display(field: Field, value: FormValues[string] | undefined) {
    if (value === undefined) return '—';
    if (field.type === 'checkbox') return value ? 'Sí' : 'No';
    if (field.type === 'select') return field.options?.find((o) => String(o.value) === String(value))?.label ?? String(value);
    return String(value);
}

/**
 * Un formulario armado con una lista de campos en JSON, con validación en el navegador antes de llamar al back.
 *
 * Hace una de dos cosas al enviar:
 * - `action`: llama a la Server Action con los valores y, si sale bien, recarga la página.
 * - `toUrl`: no llama a nada; pone los valores en la URL (`?desde=...&hasta=...`) y el `page.tsx` los lee de
 *   `searchParams`. Sirve para filtros (rango de fechas, sucursal, día).
 *
 * Opcionales: `review` muestra un resumen antes de confirmar (con ese texto arriba), `refreshOnError` recarga la página
 * también cuando el back rechaza (para traer datos nuevos), `successMessage` avisa en un toast que salió bien (montá
 * `<AppToaster />` en la página), `onDone` corre cuando salió bien (lo usa `FormDialog`).
 */
export function JsonForm({
    fields,
    submitLabel,
    action,
    toUrl = false,
    review,
    refreshOnError = false,
    resetOnSuccess = true,
    successMessage,
    onDone,
}: {
    fields: Field[];
    submitLabel: string;
    action?: (values: FormValues) => Promise<BackResult>;
    toUrl?: boolean;
    review?: string;
    refreshOnError?: boolean;
    resetOnSuccess?: boolean;
    successMessage?: string;
    onDone?: () => void;
}) {
    const router = useRouter();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [backError, setBackError] = useState<string | null>(null);
    const [reviewing, setReviewing] = useState<FormValues | null>(null);
    const [formKey, setFormKey] = useState(0); // cambiarla vacía el form
    const [pending, startTransition] = useTransition();

    function send(values: FormValues) {
        if (toUrl) {
            const params = new URLSearchParams(Object.entries(values).map(([k, v]) => [k, String(v)]));
            router.push(`?${params}`);
            return onDone?.();
        }
        startTransition(async () => {
            const result = await action!(values);
            setReviewing(null);
            if (!result.ok) {
                setBackError(result.message);
                if (refreshOnError) {
                    toast.error(result.message);
                    router.refresh();
                }
                return;
            }
            if (resetOnSuccess) setFormKey((k) => k + 1);
            if (successMessage) toast.success(successMessage);
            onDone?.();
            router.refresh();
        });
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBackError(null);
        const values = readValues(fields, new FormData(event.currentTarget));
        const found = validate(fields, values);
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        if (review) return setReviewing(values);
        send(values);
    }

    if (reviewing) {
        return (
            <div className="flex flex-col gap-3">
                <p className="font-medium">{review}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {fields
                        .filter((f) => f.type !== 'hidden')
                        .map((f) => (
                            <div key={f.name} className="contents">
                                <dt className="text-muted-foreground">{f.label ?? f.name}</dt>
                                <dd>{display(f, reviewing[f.name])}</dd>
                            </div>
                        ))}
                </dl>
                <div className="flex gap-2 self-end">
                    <Button variant="outline" onClick={() => setReviewing(null)} disabled={pending}>
                        Volver
                    </Button>
                    <Button loading={pending} onClick={() => send(reviewing)}>
                        Confirmar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form key={formKey} onSubmit={submit} noValidate className="flex flex-col gap-3">
            {fields.map((field) => (
                <FieldInput
                    key={field.name}
                    field={field}
                    error={errors[field.name]}
                    onChange={() => errors[field.name] && setErrors(({ [field.name]: _, ...rest }) => rest)}
                />
            ))}
            {backError && (
                <Alert variant="error">
                    <AlertDescription>{backError}</AlertDescription>
                </Alert>
            )}
            <Button type="submit" loading={pending} className="self-end">
                {submitLabel}
            </Button>
        </form>
    );
}

function FieldInput({ field, error, onChange }: { field: Field; error?: string; onChange: () => void }) {
    const id = `field-${field.name}`;
    const common = { id, name: field.name, onChange, 'aria-invalid': !!error || undefined };
    const defaultValue = field.defaultValue === undefined ? undefined : String(field.defaultValue);

    if (field.type === 'hidden') return <input type="hidden" name={field.name} defaultValue={defaultValue} />;

    if (field.type === 'checkbox') {
        return (
            <div className="flex flex-col gap-1">
                <label htmlFor={id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...common} defaultChecked={field.defaultValue === true} className="size-4" />
                    {field.label}
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            {field.label && <Label htmlFor={id}>{field.label}</Label>}
            {field.type === 'textarea' ? (
                <Textarea {...common} placeholder={field.placeholder} defaultValue={defaultValue} />
            ) : field.type === 'select' ? (
                <select
                    {...common}
                    defaultValue={defaultValue ?? ''}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                >
                    <option value="">{field.placeholder ?? 'Elegí una opción'}</option>
                    {field.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            ) : (
                <Input {...common} type={field.type ?? 'text'} placeholder={field.placeholder} defaultValue={defaultValue} />
            )}
            {field.hint && !error && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
```

Lo básico: una lista de campos y una acción.

```tsx
<JsonForm
    action={venderPaquete}
    submitLabel="Vender"
    successMessage="Paquete vendido"
    fields={[
        { name: 'serviceId', label: 'Servicio', type: 'select', options: servicios, required: 'Elegí un servicio' },
        { name: 'sessions', label: 'Sesiones', type: 'number', required: 'Faltan las sesiones',
          min: { value: 1, message: 'Mínimo 1' }, max: { value: 50, message: 'Máximo 50' } },
        { name: 'expiresAt', label: 'Vence', type: 'date', required: 'Falta el vencimiento',
          min: { value: 'today', message: 'No puede vencer en el pasado' } },
        { name: 'clientEmail', label: 'Email del Cliente', type: 'email', required: 'Falta el email',
          pattern: { value: '^\\S+@\\S+\\.\\S+$', message: 'Ese email no es válido' } },
    ]}
/>
```

```ts
// actions.ts: la acción recibe los valores ya convertidos (sessions es number, serviceId es string del select)
export async function venderPaquete(values: FormValues) {
    return back('POST', '/packs', { body: { ...values, serviceId: Number(values.serviceId) }, auth: true });
}
```

Todo el detalle (cada tipo de campo, cada regla, cómo agregar los tuyos) está en la
[sección 3](#3-jsonform-a-fondo).

### `FormDialog` — el mismo formulario, dentro de un modal

`app/_components/quick/FormDialog.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button, type ButtonProps } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/ui/dialog';
import { JsonForm } from './JsonForm';

/** Un `JsonForm` dentro de un modal: el botón `trigger` lo abre y se cierra solo cuando la acción sale bien. */
export function FormDialog({
    trigger,
    title,
    description,
    variant = 'outline',
    ...form
}: React.ComponentProps<typeof JsonForm> & {
    trigger: string;
    title: string;
    description?: string;
    variant?: ButtonProps['variant'];
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant={variant} />}>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <JsonForm {...form} onDone={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
```

Recibe todo lo de `JsonForm`, más `trigger` (el texto del botón que lo abre), `title` y `description`. Se cierra
solo cuando la acción sale bien. Sirve para acciones por fila de una tabla:

```tsx
<FormDialog
    trigger="Responder"
    title={`Responder el reclamo #${reclamo.id}`}
    action={responderReclamo.bind(null, reclamo.id)}
    submitLabel="Responder y resolver"
    fields={[{ name: 'response', label: 'Respuesta', type: 'textarea', required: 'Escribí una respuesta' }]}
/>
```

### `DataTable` — una tabla con estado vacío

`app/_components/quick/DataTable.tsx`

```tsx
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/app/_components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table';

/**
 * Una columna: `key` muestra ese campo de la fila (con `format` si es fecha o plata); `cell` dibuja lo que quieras
 * (botones, badges). Si están las dos, gana `cell`.
 */
export type Column<T> = {
    label: string;
    key?: keyof T;
    format?: 'date' | 'datetime' | 'time' | 'money';
    cell?: (row: T) => React.ReactNode;
    className?: string;
};

function formatValue(value: unknown, format?: Column<unknown>['format']): React.ReactNode {
    if (value === null || value === undefined || value === '') return '—';
    if (format === 'date') return new Date(String(value)).toLocaleDateString('es-AR');
    if (format === 'datetime') return new Date(String(value)).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    if (format === 'time') return new Date(String(value)).toLocaleTimeString('es-AR', { timeStyle: 'short' });
    if (format === 'money') return Number(value).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    return String(value);
}

/**
 * Tabla con estado vacío, armada con una lista de columnas. Sin `'use client'`: usala en un `page.tsx` del
 * servidor y podés pasarle `cell` con funciones, y adentro botones de `quick/` (que sí son de cliente).
 */
export function DataTable<T extends { id: number | string }>({
    rows,
    columns,
    empty,
    emptyDescription,
}: {
    rows: T[];
    columns: Column<T>[];
    empty: string;
    emptyDescription?: string;
}) {
    if (rows.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>{empty}</EmptyTitle>
                    {emptyDescription && <EmptyDescription>{emptyDescription}</EmptyDescription>}
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {columns.map((c) => (
                        <TableHead key={c.label}>{c.label}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                        {columns.map((c) => (
                            <TableCell key={c.label} className={c.className ?? 'whitespace-normal'}>
                                {c.cell ? c.cell(row) : c.key ? formatValue(row[c.key], c.format) : null}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
```

```tsx
<DataTable
    rows={reclamos}                                   // cada fila necesita un `id`
    empty="No hay Reclamos abiertos"
    emptyDescription="Cuando un Cliente reclame un Turno, aparece acá."
    columns={[
        { label: 'Turno', cell: (r) => `#${r.bookingId}` },          // lo que quieras
        { label: 'Motivo', key: 'reason' },                           // el campo tal cual
        { label: 'Fecha', key: 'createdAt', format: 'date' },         // date | datetime | time | money
        { label: '', cell: (r) => <FormDialog ... /> },               // botones por fila
    ]}
/>
```

`DataTable` **no** es `'use client'`: por eso le podés pasar funciones en `cell` desde un `page.tsx`. Si no tenés
`id` (por ejemplo, un ranking), armalo: `rows.map((r) => ({ ...r, id: r.name }))`.

### `Countdown` y `Expiring` — cuentas regresivas

`app/_components/quick/Countdown.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Los milisegundos que faltan hasta `until`, actualizados cada segundo; `null` hasta montarse (evita el desfase servidor/navegador). */
function useRemaining(until: string) {
    const [remaining, setRemaining] = useState<number | null>(null);
    useEffect(() => {
        const tick = () => setRemaining(Math.max(0, Date.parse(until) - Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [until]);
    return remaining;
}

/** Cuando `remaining` llega a 0, recarga los datos de la página una vez (el back procesa el vencimiento al consultar). */
function useRefreshAtZero(remaining: number | null) {
    const router = useRouter();
    const expired = remaining === 0;
    useEffect(() => {
        if (expired) router.refresh();
    }, [expired, router]);
    return expired;
}

/** Cuenta regresiva `mm:ss` hasta `until` (ISO). Al llegar a 0 muestra `expiredText` y recarga la página. */
export function Countdown({ until, expiredText = 'Vencida' }: { until: string; expiredText?: string }) {
    const remaining = useRemaining(until);
    const expired = useRefreshAtZero(remaining);
    if (remaining === null) return null;
    if (expired) return <span className="text-destructive">{expiredText}</span>;
    const minutes = Math.floor(remaining / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    return (
        <span className="font-mono tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
}

/** Muestra `children` hasta `until` (ISO); después desaparecen solos, sin recargar, y se piden los datos nuevos. */
export function Expiring({ until, children }: { until: string; children: React.ReactNode }) {
    const expired = useRefreshAtZero(useRemaining(until));
    return expired ? null : children;
}
```

```tsx
Vence en <Countdown until={oferta.offerExpiresAt} />          {/* 14:59, 14:58... y "Vencida" */}

<Expiring until={oferta.offerExpiresAt}>                        {/* desaparece sola al vencer */}
    <Card>...</Card>
</Expiring>
```

Las dos, al llegar a 0, hacen `router.refresh()`: la página vuelve a pedir los datos y el back procesa el
vencimiento (como piden las consignas: "se procesa al consultar").

### `ErrorAlert` y `dates.ts` — atajos

`app/_components/quick/ErrorAlert.tsx`

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/app/_components/ui/alert';

/** El cartel rojo con el mensaje del back. Para el `if (!result.ok) return <ErrorAlert message={result.message} />`. */
export function ErrorAlert({ message, title }: { message: string; title?: string }) {
    return (
        <Alert variant="error">
            {title && <AlertTitle>{title}</AlertTitle>}
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}
```

`app/_components/quick/dates.ts`

```ts
// Fechas en la hora de Argentina, para mostrar y para armar rangos `YYYY-MM-DD`. Sirven en servidor y navegador.

const TZ = 'America/Argentina/Buenos_Aires';

/** `YYYY-MM-DD` de un instante (por defecto, ahora). */
export const ymd = (date: Date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: TZ });

/** `YYYY-MM-DD` corrido `days` días (negativo para atrás). */
export const addDays = (date: string, days: number) => ymd(new Date(Date.parse(`${date}T12:00:00-03:00`) + days * 86_400_000));

/** Días entre dos `YYYY-MM-DD`, contando los dos extremos: del 1 al 3 son 3. */
export const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;

/** "lun 1/12 10:30" */
export const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "10:30" */
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

/** "$ 12.500,00" */
export const fmtMoney = (value: number | string) => Number(value).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
```

---

## 1. La receta

Para cada pantalla de la consigna:

1. **¿Quién la ve?** Elegí dónde va el archivo:
   - **El Cliente, por un enlace** (sin Sesión) → colgala de una ruta que ya existe:
     `app/turnos/[link]/<tu-cosa>/page.tsx` o `app/lista-de-espera/<tu-cosa>/page.tsx`. No crees `app/<palabra>/`
     suelta: compite con `app/[slug]` (la página pública de cada Negocio).
   - **El Dueño o el Empleado, logueado** → `app/(app)/<tu-cosa>/page.tsx`. El layout de `(app)` ya pide
     Sesión y pone el menú lateral. Para que aparezca en el menú, tres lugares:
     1. `app/(app)/layout.tsx` → `navItems`: `{ id: 'claims', href: '/reclamos', label: 'Reclamos' }`
     2. `app/(app)/_components/types.ts` → `| 'claims'` en `SectionId`
     3. `app/(app)/_components/AppSidebar.tsx` → un ícono de `lucide-react` en `ICONS`: `claims: MessageSquare`
2. **¿Qué muestra?** En `page.tsx`, un `await back('GET', ...)` y `DataTable`, `Card` o lo que haga falta.
3. **¿Qué cambia?** Una función por endpoint de escritura en `actions.ts` (snippet D).
4. **¿Cómo lo dispara el usuario?**
   - Sin datos → `ActionButton`.
   - Con datos → `JsonForm` (en la página) o `FormDialog` (en un modal, por fila).
   - Un filtro (fecha, sucursal, día) → `JsonForm` con `toUrl` y leé `searchParams` (snippet H).
   - Si la acción necesita un id o un link, fijalo con `.bind(null, id)`.
5. **Validación de la consigna:**
   - **De formato** (vacío, rango de fechas, número entre 1 y 50): reglas de `JsonForm`. No llega al back.
   - **De negocio** (vencido, sin cupo, de otro servicio): nada en el front. Probá el caso inválido y comprobá que
     se ve el mensaje del back en rojo. Si está en inglés o es confuso, cambialo **en el back**.
   - **"Deshabilitado y explicar el motivo"**: `disabledReason` de `ActionButton`, calculado en `page.tsx`.

---

## 2. Snippets

En todos los ejemplos, `Cosa` es el tipo que devuelve tu endpoint. Copiá los campos del JSON que ves en la
respuesta (o del `model` en `schema.prisma`). Las fechas llegan como `string`.

### A. Página que lee del back

```tsx
// app/turnos/[link]/mi-cosa/page.tsx   (o app/(app)/mi-cosa/page.tsx)
import { back } from '@/app/_components/back';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';

type Cosa = { id: number; status: 'OPEN' | 'CLOSED'; reason: string };

export default async function MiCosaPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;                        // en Next 16, params es una Promise
    const result = await back<Cosa>('GET', `/mi-endpoint/${link}`);
    if (!result.ok) return <ErrorAlert message={result.message} />;

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
            <h1 className="text-xl font-semibold">Título</h1>
            {/* acá van los snippets B, C, E, F... usando result.data */}
        </main>
    );
}
```

¿Distinto según lo que devolvió el back? Usá `result.status`:

```tsx
{result.ok ? <MostrarCosa /> : result.status === 404 ? <FormularioParaCrearla /> : <ErrorAlert message={result.message} />}
```

### B. Tarjeta con estado

```tsx
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';

<Card>
    <CardHeader>
        <CardTitle>Tu reclamo</CardTitle>
        <CardDescription>{cosa.reason}</CardDescription>
        <CardAction>
            <Badge variant={cosa.status === 'OPEN' ? 'secondary' : 'default'}>
                {cosa.status === 'OPEN' ? 'Abierto' : 'Resuelto'}
            </Badge>
        </CardAction>
    </CardHeader>
    <CardContent>{cosa.response ?? 'Todavía sin respuesta.'}</CardContent>
</Card>
```

Variantes de `Badge`: `default`, `secondary`, `destructive`, `outline`.

### C. Tabla

```tsx
<DataTable rows={cosas} empty="No hay nada todavía" columns={[
    { label: 'Motivo', key: 'reason' },
    { label: 'Fecha', key: 'createdAt', format: 'datetime' },
    { label: '', cell: (cosa) => <ActionButton action={borrar.bind(null, cosa.id)}>Borrar</ActionButton> },
]} />
```

### D. Server Actions (`actions.ts`, al lado de `page.tsx`)

```ts
'use server';

import { back } from '@/app/_components/back';
import type { FormValues } from '@/app/_components/quick/JsonForm';

// Sin cuerpo (para ActionButton)
export async function aceptarCosa(link: string) {
    return back('POST', `/mi-endpoint/${link}/aceptar`);
}

// Con los valores de un JsonForm: van tal cual al body
export async function crearCosa(link: string, values: FormValues) {
    return back('POST', `/mi-endpoint/${link}`, { body: values });
}

// Con Sesión (el Dueño) y un campo que hay que convertir
export async function responderCosa(id: number, values: FormValues) {
    return back('PUT', `/mi-endpoint/${id}`, { body: { response: values.response }, auth: true });
}
```

Las acciones **devuelven** el `BackResult`, no tiran: así el componente muestra el mensaje del back. Con
`.bind(null, link)` fijás los primeros argumentos; los valores del form llegan últimos.

### E. Botón que hace algo

```tsx
<ActionButton action={aceptarCosa.bind(null, link)}>Aceptar</ActionButton>
```

### F. Formulario en la página

```tsx
<JsonForm action={crearCosa.bind(null, link)} submitLabel="Enviar" fields={[
    { name: 'reason', label: '¿Qué pasó?', type: 'textarea', required: 'Contanos qué pasó',
      maxLength: { value: 500, message: 'Máximo 500 caracteres' } },
]} />
```

### G. Formulario en un modal (por fila de una tabla)

```tsx
<FormDialog trigger="Responder" title={`Responder #${cosa.id}`} action={responderCosa.bind(null, cosa.id)}
    submitLabel="Responder" fields={[{ name: 'response', label: 'Respuesta', type: 'textarea', required: 'Falta la respuesta' }]} />
```

### H. Filtros en la URL (rango de fechas, sucursal, día)

`toUrl` no llama a ninguna acción: valida y pone los valores en la URL. La página los lee de `searchParams` y vuelve
a pedir los datos. Si la validación falla, **no navega, así que no se llama a la API**.

```tsx
export default async function TableroPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
    const { from = addDays(ymd(), -29), to = ymd() } = await searchParams;
    const result = await back<Tablero>('GET', `/dashboard?from=${from}&to=${to}`, { auth: true });
    // ...
    <JsonForm toUrl submitLabel="Ver" fields={[
        { name: 'from', label: 'Desde', type: 'date', defaultValue: from, required: 'Falta Desde' },
        { name: 'to', label: 'Hasta', type: 'date', defaultValue: to, required: 'Falta Hasta',
          notBefore: { value: 'from', message: 'Hasta no puede ser antes que Desde' },
          maxDaysAfter: { field: 'from', days: 90, message: 'El rango máximo es de 90 días' } },
    ]} />
```

Para "día anterior / siguiente", un link alcanza: `<Button render={<Link href={`?date=${addDays(date, 1)}`} />}>Siguiente</Button>`.

### I. Mensaje fijo (aviso, éxito, vencido)

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/app/_components/ui/alert';

<Alert variant="warning">
    <AlertTitle>No se puede reprogramar</AlertTitle>
    <AlertDescription>Faltan 23 h y la política permite cambios hasta 24 h antes.</AlertDescription>
</Alert>
```

Variantes de `Alert`: `default`, `info`, `success`, `warning`, `error`.

---

## 3. `JsonForm` a fondo

### Los campos

| Propiedad | Qué hace |
|---|---|
| `name` | La clave con la que llega el valor a la acción. **Tiene que coincidir con el campo del DTO del back** (si no, 400 `property x should not exist`) |
| `label` | El texto arriba del campo |
| `type` | `text` (por defecto), `email`, `number`, `date`, `datetime-local`, `time`, `textarea`, `select`, `checkbox`, `hidden` |
| `placeholder` | En un `select`, es el texto de la opción vacía ("Elegí una opción", "Todas") |
| `defaultValue` | El valor inicial. En un filtro con `toUrl`, pasale lo que leíste de `searchParams` |
| `options` | Solo `select`: `[{ value: 1, label: 'Corte' }]` |
| `hint` | Texto chico debajo del campo (se esconde cuando hay error) |

**Qué le llega a la acción:** `number` llega como número, `checkbox` como `true`/`false`, el resto como texto sin
espacios en los bordes. **Los campos vacíos no viajan**: así un campo opcional no le llega al back como `""` (que
muchas veces falla la validación del DTO). Un `select` llega como texto: si el back espera un número, convertilo en
la acción (`Number(values.serviceId)`).

### Las reglas

Cada regla lleva su mensaje: el que ve el usuario debajo del campo. Solo se muestra el primer error de cada campo.

| Regla | Ejemplo | Falla si... |
|---|---|---|
| `required` | `required: 'Falta el email'` | está vacío (o sin tildar, en un checkbox) |
| `min` / `max` | `min: { value: 1, message: 'Mínimo 1' }` | en `number`, el número es menor/mayor. En el resto, compara texto: sirve para `date` (`'2026-12-01'`), `time` (`'08:00'`) y `'today'` (hoy) |
| `minLength` / `maxLength` | `maxLength: { value: 500, message: 'Máximo 500' }` | el texto es más corto/largo |
| `pattern` | `pattern: { value: '^[A-Z0-9]{8}$', message: '8 letras o números' }` | no coincide con la expresión regular (escrita como texto: las `\` van dobles) |
| `notBefore` | `notBefore: { value: 'from', message: '...' }` | es menor que otro campo del form (`hasta` antes que `desde`) |
| `maxDaysAfter` | `maxDaysAfter: { field: 'from', days: 90, message: '...' }` | entre otro campo y este hay más de `days` días, contando los dos |

Las reglas se chequean al enviar. Con alguna en falta, no se llama a la acción (ni se cambia la URL).

### Las opciones del formulario

| Prop | Qué hace |
|---|---|
| `action` | La Server Action. Recibe los valores; si devuelve `ok`, vacía el form y recarga la página |
| `toUrl` | En lugar de una acción: pone los valores en la URL (filtros) |
| `submitLabel` | El texto del botón |
| `review` | Antes de llamar a la acción, muestra un resumen de los valores (con este texto arriba) y los botones **Volver** y **Confirmar** |
| `refreshOnError` | Si el back rechaza, además del error, recarga la página: para que se vean datos nuevos (horarios actualizados) |
| `successMessage` | Toast cuando sale bien (con `<AppToaster />` en la página) |
| `resetOnSuccess` | `false` para que no se vacíe el form al guardar (por ejemplo, un form de configuración) |

### Recetas por consigna

| Consigna | Campos | Opciones |
|---|---|---|
| Vender un paquete | `select` de servicio, `number` con `min`/`max`, `date` con `min: 'today'`, `email` con `pattern` | `action`, `successMessage` |
| Anotarse a la lista de espera | `text` nombre, `email` | dentro de `FormDialog` |
| Aceptar una oferta con código | `text` con `pattern: '^[A-Z0-9]{6}$'` | `refreshOnError` |
| Configurar la penalización | `number` 0–100, `number` días | `resetOnSuccess={false}`, `defaultValue` con lo que devolvió el GET |
| Reprogramar | `select` con los horarios libres | `review` (horario anterior y nuevo), `refreshOnError` |
| Dashboard | dos `date` + `select` de sucursal | `toUrl`, `notBefore`, `maxDaysAfter` |
| Agenda del día | un `date` | `toUrl` (o links de anterior/siguiente) |

### ¿Necesitás otro tipo de campo?

Todo pasa en `FieldInput`, al final de `JsonForm.tsx`. Tres pasos. Ejemplo: **botones de opción** (`radio`).

1. Sumá el tipo a `Field['type']`:

```ts
type?: 'text' | 'email' | ... | 'hidden' | 'radio';
```

2. Dibujalo en `FieldInput`, antes del `return` final. Lo único obligatorio es que el `<input>` tenga
   `name={field.name}`: el form lee los valores con `FormData`, por nombre.

```tsx
if (field.type === 'radio') {
    return (
        <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">{field.label}</legend>
            {field.options?.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={field.name} value={o.value} onChange={onChange}
                        defaultChecked={String(field.defaultValue) === String(o.value)} />
                    {o.label}
                </label>
            ))}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </fieldset>
    );
}
```

3. Si el valor no es texto, convertilo en `readValues` (como `number` y `checkbox`):

```ts
values[field.name] = field.type === 'number' || field.type === 'range' ? Number(raw) : raw;
```

Otros tipos que salen igual: `range` (un `<Input type="range" min max />`), `tel`, `url`, `password`, `color`
(todos con el `<Input>` del final; solo sumalos a la lista de tipos). Para **varios checkboxes con el mismo nombre**
(elegir varios días), leelos con `form.getAll(field.name)` en `readValues`.

### ¿Necesitás otra regla?

Dos pasos en `JsonForm.tsx`. Ejemplo: **no puede ser fin de semana**.

1. Sumala a `Field`, siempre con su mensaje:

```ts
/** Una fecha que no puede caer sábado ni domingo. */
weekday?: { message: string };
```

2. Chequeala en `validate`, con las demás:

```ts
if (field.weekday && [0, 6].includes(new Date(`${value}T12:00:00`).getDay())) fail(field.weekday.message);
```

Y se usa: `{ name: 'date', type: 'date', weekday: { message: 'Elegí un día de semana' } }`.

> **¿Por qué no una función `validate` en cada campo?** Porque los campos se arman en `page.tsx`, que corre en el
> servidor, y `JsonForm` corre en el navegador: Next no deja pasar funciones de uno a otro ("Functions cannot be
> passed directly to Client Components"). Las reglas en JSON sí pasan. Si una regla depende de datos del back (el
> cupo de un servicio), no la pongas en el front: que la valide el back y `JsonForm` muestra su mensaje.

---

## 4. Ejemplo resuelto: Lista de espera, vista del Cliente

La consigna 5 de `consignas-parcial.md`, con el back de la consigna 0 ya hecho (está en
`consignas-resueltas.md`). Es la que más componentes usa.

Back (ya hecho, `agendic-back/src/infrastructure/slot-waitlist/`):

| Endpoint | Auth | Devuelve |
|---|---|---|
| `GET /slot-waitlist/taken?serviceId=&date=` | no | `[{ id, startsAt }]`: los horarios ocupados de ese día |
| `POST /slot-waitlist` `{ serviceId, startsAt, clientName, email }` | no | 201 `{ link }`, o 422 si el horario está libre |
| `GET /slot-waitlist/offers?email=` | no | Las ofertas vigentes de ese email (procesa los vencimientos antes) |
| `POST /slot-waitlist/:link/accept` | no | 201, o **422 "La oferta venció..."** |
| `POST /slot-waitlist/:link/decline` | no | 201 |

| Punto de la consigna | Archivo | Componentes |
|---|---|---|
| 1. En los horarios ocupados, "Avisarme si se libera" | `app/lista-de-espera/ocupados/page.tsx` | `JsonForm` (`toUrl`) + `DataTable` + `FormDialog` |
| 2. "Mis ofertas" con cuenta regresiva | `app/lista-de-espera/ofertas/page.tsx` | `JsonForm` (`toUrl`) + `Countdown` |
| 3. Aceptar o rechazar cada oferta | la misma página | `ActionButton` |
| 4. Cuando vence, desaparece sin recargar | la misma página | `Expiring` |
| 5. Funciona en el celular | las dos | `max-w-lg`, `flex-col sm:flex-row` |
| Validación: aceptar una que el servidor da por vencida | nada nuevo: `refreshOnError` muestra el mensaje y recarga; el back ya no la devuelve y la tarjeta se va | — |

`app/lista-de-espera/ocupados/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';
import type { FormValues } from '@/app/_components/quick/JsonForm';

/** Anotarse a la lista de espera de un horario ocupado. `values` trae `clientName` y `email` del form. */
export async function anotarme(serviceId: number, startsAt: string, values: FormValues) {
    return back('POST', '/slot-waitlist', { body: { serviceId, startsAt, ...values } });
}
```

`app/lista-de-espera/ocupados/page.tsx`

```tsx
import { AppToaster } from '@/app/_components/AppToaster';
import { back } from '@/app/_components/back';
import { DataTable } from '@/app/_components/quick/DataTable';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { FormDialog } from '@/app/_components/quick/FormDialog';
import { JsonForm } from '@/app/_components/quick/JsonForm';
import { anotarme } from './actions';

type Ocupado = { id: string; startsAt: string };

export default async function OcupadosPage({ searchParams }: { searchParams: Promise<{ serviceId?: string; date?: string }> }) {
    const { serviceId, date } = await searchParams;
    const result = serviceId && date ? await back<Ocupado[]>('GET', `/slot-waitlist/taken?serviceId=${serviceId}&date=${date}`) : null;

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
            <AppToaster />
            <h1 className="text-xl font-semibold">Horarios ocupados</h1>
            <JsonForm
                toUrl
                submitLabel="Ver horarios"
                fields={[
                    { name: 'serviceId', label: 'Servicio (id)', type: 'number', defaultValue: serviceId, required: 'Falta el Servicio' },
                    {
                        name: 'date',
                        label: 'Día',
                        type: 'date',
                        defaultValue: date,
                        required: 'Falta el día',
                        min: { value: 'today', message: 'Elegí hoy o un día que viene' },
                    },
                ]}
            />
            {result && !result.ok && <ErrorAlert message={result.message} />}
            {result?.ok && (
                <DataTable
                    rows={result.data}
                    empty="No hay horarios ocupados ese día"
                    columns={[
                        { label: 'Hora', key: 'startsAt', format: 'time' },
                        {
                            label: 'Lista de espera',
                            className: 'text-right',
                            cell: (ocupado) => (
                                <FormDialog
                                    trigger="Avisarme si se libera"
                                    title="Avisarme si se libera"
                                    description="Si se libera, te lo ofrecemos por 15 minutos. Lo ves en Mis ofertas."
                                    submitLabel="Anotarme"
                                    successMessage="Listo: te anotamos"
                                    action={anotarme.bind(null, Number(serviceId), ocupado.startsAt)}
                                    fields={[
                                        { name: 'clientName', label: 'Nombre', required: 'Falta tu nombre' },
                                        {
                                            name: 'email',
                                            label: 'Email',
                                            type: 'email',
                                            required: 'Falta tu email',
                                            pattern: { value: '^\\S+@\\S+\\.\\S+$', message: 'Ese email no es válido' },
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
            )}
        </main>
    );
}
```

`app/lista-de-espera/ofertas/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';

export async function aceptarOferta(link: string) {
    return back('POST', `/slot-waitlist/${link}/accept`);
}

export async function rechazarOferta(link: string) {
    return back('POST', `/slot-waitlist/${link}/decline`);
}
```

`app/lista-de-espera/ofertas/page.tsx`

```tsx
import { AppToaster } from '@/app/_components/AppToaster';
import { back } from '@/app/_components/back';
import { ActionButton } from '@/app/_components/quick/ActionButton';
import { Countdown, Expiring } from '@/app/_components/quick/Countdown';
import { fmtDateTime } from '@/app/_components/quick/dates';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { JsonForm } from '@/app/_components/quick/JsonForm';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/app/_components/ui/empty';
import { aceptarOferta, rechazarOferta } from './actions';

type Oferta = { id: number; link: string; startsAt: string; offerExpiresAt: string; service: { name: string } };

export default async function MisOfertasPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
    const { email } = await searchParams;
    const result = email ? await back<Oferta[]>('GET', `/slot-waitlist/offers?email=${encodeURIComponent(email)}`) : null;

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
            <AppToaster />
            <h1 className="text-xl font-semibold">Mis ofertas</h1>
            <JsonForm
                toUrl
                submitLabel="Ver mis ofertas"
                fields={[{ name: 'email', label: 'Tu email', type: 'email', defaultValue: email, required: 'Falta tu email' }]}
            />

            {result && !result.ok && <ErrorAlert message={result.message} />}
            {result?.ok && result.data.length === 0 && (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No tenés ofertas vigentes</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            )}
            {result?.ok &&
                result.data.map((oferta) => (
                    <Expiring key={oferta.id} until={oferta.offerExpiresAt}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{oferta.service.name}</CardTitle>
                                <CardDescription>{fmtDateTime(oferta.startsAt)}</CardDescription>
                                <CardAction className="text-sm">
                                    Vence en <Countdown until={oferta.offerExpiresAt} />
                                </CardAction>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2 sm:flex-row">
                                <ActionButton action={aceptarOferta.bind(null, oferta.link)} refreshOnError successMessage="¡Turno reservado!">
                                    Aceptar
                                </ActionButton>
                                <ActionButton action={rechazarOferta.bind(null, oferta.link)} variant="destructive-outline" refreshOnError>
                                    Rechazar
                                </ActionButton>
                            </CardContent>
                        </Card>
                    </Expiring>
                ))}
        </main>
    );
}
```

Fijate lo que **no** hay: ningún `useState`, ningún `fetch`, ningún `try/catch`, ninguna validación de negocio.
Las páginas leen, las acciones escriben, y los componentes de `quick/` hacen el resto.

---

## 5. ¿Te falta un componente?

Primero mirá si alcanza con `JsonForm` + un tipo o regla nueva (sección 3). Si no, mirá los que ya hay en
`app/_components/ui/` (alert, badge, button, card, checkbox, dialog, empty, input, select, switch, table, tabs,
textarea, tooltip...). Si el que necesitás no está, buscalo en [coss.com/ui](https://coss.com/ui) y agregalo con:

```powershell
npx shadcn@latest add @coss/<nombre>
```

Se instala en `app/_components/ui/` (lo dice `components.json`). Copiá el ejemplo de uso de la página de coss.
Los componentes de coss usan Base UI: para que un botón abra algo (o sea un link) se usa `render={<Button />}`, no
`asChild`.

Si armás uno propio en `quick/`, seguí la misma idea: que reciba **datos en JSON y Server Actions**, nunca funciones
comunes, así se puede usar desde un `page.tsx`.

---

## 6. Si algo no anda

| Síntoma | Causa probable |
|---|---|
| `No se pudo conectar con el back` | El back no está levantado, o `API_URL` en `agendic-front/.env.local` apunta a otro puerto |
| Ves `Unauthorized` (401) | Endpoint con `ClerkGuard` y te olvidaste `auth: true` |
| Te manda a `/sign-in` | La página está en `app/(app)/` y no iniciaste sesión |
| 404 en todo | La ruta del `back(...)` no coincide con el `@Controller` + `@Get` del back |
| 400 `property x should not exist` | Mandaste un campo que el DTO del back no declara: revisá los `name` de los campos de `JsonForm` |
| 400 `x must be an integer number` | Un `select` manda texto: convertilo con `Number(...)` en la acción |
| La pantalla no se actualiza después de guardar | Los componentes de `quick/` hacen `router.refresh()`; si escribiste tu propio form, agregalo |
| El toast no aparece | Falta `<AppToaster />` en la página (las de `app/(app)/` ya lo tienen) |
| `Functions cannot be passed directly to Client Components` | Le pasaste una función común a un componente de `quick/` (por ejemplo, `validate` o un `onClick`): tiene que ser una Server Action de un archivo con `'use server'`, o una regla en JSON |
| Un filtro con `toUrl` no cambia nada | La página no lee `searchParams`, o no le pasa `defaultValue` a los campos |
| `useState` / `onClick` no funciona | El archivo necesita `'use client'` arriba (los de `quick/` ya lo tienen; `page.tsx` no debe tenerlo) |
| Tipos raros | `npx tsc --noEmit` desde `agendic-front/` y arreglá lo que diga |

En desarrollo podés entrar sin Clerk: con `NEXT_PUBLIC_AUTH_OFFLINE=true` en `.env.local`, `/sign-in` te pide
solo el `clerkId` de un Usuario de la base.

---

## Qué deja afuera esta guía (a propósito)

El resto del front usa casos de uso, controllers, repositorios, Zod y clases de error en `src/`. Eso es lo
que harías para dejar la feature lista para producción. Esta guía es para ver la feature andando contra tu
back lo antes posible.
