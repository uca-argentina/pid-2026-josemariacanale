# Guía: un front mínimo para tu feature

Para resolver una consigna (Reclamos, Ofertas de turno liberado, etc.) cuando **el back ya está hecho** y
necesitás pantallas que lo llamen. Es lo más precario que funciona: sin `src/`, sin casos de uso, sin
controllers, sin Zod. Solo tres cosas por feature:

| Archivo | Qué hace | Corre en |
|---|---|---|
| `page.tsx` | Pide datos al back (GET) y los muestra | Servidor |
| `actions.ts` | Manda cambios al back (POST/PUT/DELETE) | Servidor |
| Una plantilla de `app/_components/quick/` | Botón o formulario que llama a una acción | Navegador |

Los componentes visuales (`Button`, `Card`, `Table`...) son de [coss ui](https://coss.com/ui) y ya están en
`app/_components/ui/`.

> **Por qué todo pasa por el servidor:** el token de la Sesión y `API_URL` viven en el servidor de Next. Si
> llamás al back con `fetch` desde un componente `'use client'`, no tenés ninguno de los dos. Regla: **el
> navegador nunca llama al back; llama a una Server Action, y la acción llama al back.**

---

## 0. Las piezas base (ya están en el repo)

Se usan tal cual; no hace falta tocarlas.

### `app/_components/back.ts` — el único `fetch` al back

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

Uso:

```ts
await back('GET', `/claims/${link}`);                                    // público: el enlace es la credencial
await back('GET', '/claims', { auth: true });                            // con Sesión (endpoint con ClerkGuard)
await back('PUT', `/claims/${id}`, { body: { response }, auth: true });  // con cuerpo
```

Si el endpoint del back tiene `@UseGuards(ClerkGuard)`, poné `auth: true`. Si no, no.

### `app/_components/quick/ActionButton.tsx` — botón que dispara una acción sin datos

Para "Aceptar oferta", "Cancelar", "Borrar". Muestra el spinner, el error del back debajo, y recarga la
página si salió bien.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { BackResult } from '@/app/_components/back';
import { Button, type ButtonProps } from '@/app/_components/ui/button';

/** Un botón que corre una Server Action sin datos (aceptar, cancelar, borrar) y recarga la página si salió bien. */
export function ActionButton({
    action,
    children,
    variant,
}: {
    action: () => Promise<BackResult>;
    children: React.ReactNode;
    variant?: ButtonProps['variant'];
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function run() {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (!result.ok) return setError(result.message);
            router.refresh();
        });
    }

    return (
        <div className="flex flex-col gap-1">
            <Button variant={variant} loading={pending} onClick={run}>
                {children}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
```

### `app/_components/quick/TextForm.tsx` — formulario de un solo texto

Para "motivo", "respuesta", "comentario".

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { BackResult } from '@/app/_components/back';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import { Button } from '@/app/_components/ui/button';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';

export function TextForm({
    action,
    label,
    submitLabel,
    placeholder,
    onDone,
}: {
    action: (text: string) => Promise<BackResult>;
    label: string;
    submitLabel: string;
    placeholder?: string;
    onDone?: () => void;
}) {
    const router = useRouter();
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function submit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
            const result = await action(text);
            if (!result.ok) return setError(result.message);
            setText('');
            onDone?.();
            router.refresh();
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Label htmlFor="text-form-field">{label}</Label>
            <Textarea
                id="text-form-field"
                value={text}
                placeholder={placeholder}
                required
                onChange={(event) => setText(event.target.value)}
            />
            {error && (
                <Alert variant="error">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button type="submit" loading={pending} className="self-end">
                {submitLabel}
            </Button>
        </form>
    );
}
```

### `app/_components/quick/TextDialog.tsx` — el mismo formulario, dentro de un modal

Para acciones por fila de una tabla ("Responder", "Rechazar con motivo").

```tsx
'use client';

import { useState } from 'react';
import type { BackResult } from '@/app/_components/back';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/ui/dialog';
import { TextForm } from './TextForm';

export function TextDialog({
    action,
    trigger,
    title,
    label,
    submitLabel,
}: {
    action: (text: string) => Promise<BackResult>;
    trigger: string;
    title: string;
    label: string;
    submitLabel: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <TextForm action={action} label={label} submitLabel={submitLabel} onDone={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
```

---

## 1. La receta

Para cada pantalla de la consigna:

1. **¿Quién la ve?** Elegí dónde va el archivo:
   - **El Cliente, por un enlace** (sin Sesión) → colgala de una ruta que ya existe:
     `app/turnos/[link]/<tu-cosa>/page.tsx`. No crees `app/<palabra>/` suelta: compite con `app/[slug]`
     (la página pública de cada Negocio).
   - **El Dueño o el Empleado, logueado** → `app/(app)/<tu-cosa>/page.tsx`. El layout de `(app)` ya pide
     Sesión y pone el menú lateral. Para que aparezca en el menú, sumá una línea a `navItems` en
     `app/(app)/layout.tsx`:
     ```ts
     { id: 'claims', href: '/reclamos', label: 'Reclamos' },
     ```
2. **¿Qué muestra?** En `page.tsx`, un `await back('GET', ...)` y JSX con componentes de coss (snippets A–C).
3. **¿Qué cambia?** Una función por endpoint de escritura en `actions.ts` (snippet D).
4. **¿Cómo lo dispara el usuario?** Pasale la acción a una plantilla (snippets E–G). Si la acción necesita un
   id o un link, fijalo con `.bind(null, id)`.
5. **Validación de la consigna:** no hagas nada en el front. Probá el caso inválido y comprobá que se ve el
   mensaje del back en rojo. Si el mensaje está en inglés o es confuso, cambialo **en el back**.

---

## 2. Snippets

En todos los ejemplos, `Cosa` es el tipo que devuelve tu endpoint. Copiá los campos del JSON que ves en la
respuesta (o del `model` en `schema.prisma`). Las fechas llegan como `string`.

### A. Página que lee del back

```tsx
// app/turnos/[link]/mi-cosa/page.tsx   (o app/(app)/mi-cosa/page.tsx)
import { back } from '@/app/_components/back';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';

type Cosa = { id: number; status: 'OPEN' | 'CLOSED'; reason: string };

export default async function MiCosaPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;                        // en Next 16, params es una Promise
    const result = await back<Cosa>('GET', `/mi-endpoint/${link}`);

    if (!result.ok) {
        return (
            <Alert variant="error">
                <AlertDescription>{result.message}</AlertDescription>
            </Alert>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
            <h1 className="text-xl font-semibold">Título</h1>
            {/* acá van los snippets B, C, E, F... usando result.data */}
        </main>
    );
}
```

¿Distinto según lo que devolvió el back? Usá `result.status`:

```tsx
{result.ok ? <MostrarCosa /> : result.status === 404 ? <FormularioParaCrearla /> : <MostrarError />}
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

### C. Tabla (con estado vacío)

```tsx
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/app/_components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table';

{cosas.length === 0 ? (
    <Empty>
        <EmptyHeader>
            <EmptyTitle>No hay nada todavía</EmptyTitle>
            <EmptyDescription>Cuando haya, aparece acá.</EmptyDescription>
        </EmptyHeader>
    </Empty>
) : (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead />
            </TableRow>
        </TableHeader>
        <TableBody>
            {cosas.map((cosa) => (
                <TableRow key={cosa.id}>
                    <TableCell className="whitespace-normal">{cosa.reason}</TableCell>
                    <TableCell>{new Date(cosa.createdAt).toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">{/* snippet E o G */}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
)}
```

### D. Server Actions (`actions.ts`, al lado de `page.tsx`)

```ts
'use server';

import { back } from '@/app/_components/back';

// Público (el Cliente, por enlace)
export async function crearCosa(link: string, reason: string) {
    return back('POST', `/mi-endpoint/${link}`, { body: { reason } });
}

// Con Sesión (el Dueño)
export async function responderCosa(id: number, response: string) {
    return back('PUT', `/mi-endpoint/${id}`, { body: { response }, auth: true });
}

// Sin cuerpo
export async function aceptarCosa(link: string) {
    return back('POST', `/mi-endpoint/${link}/aceptar`);
}
```

Las acciones **devuelven** el `BackResult`, no tiran: así la plantilla muestra el mensaje del back.

### E. Botón que hace algo

```tsx
import { ActionButton } from '@/app/_components/quick/ActionButton';
import { aceptarCosa } from './actions';

<ActionButton action={aceptarCosa.bind(null, link)}>Aceptar</ActionButton>
<ActionButton action={cancelarCosa.bind(null, link)} variant="destructive-outline">Rechazar</ActionButton>
```

Variantes de `Button`: `default`, `outline`, `secondary`, `ghost`, `destructive`, `destructive-outline`, `link`.

### F. Formulario de un texto

```tsx
import { TextForm } from '@/app/_components/quick/TextForm';
import { crearCosa } from './actions';

<TextForm action={crearCosa.bind(null, link)} label="¿Qué pasó?" submitLabel="Enviar" />
```

`.bind(null, link)` fija el primer argumento; el texto del usuario llega como segundo.

### G. Modal con un texto (por fila de una tabla)

```tsx
import { TextDialog } from '@/app/_components/quick/TextDialog';
import { responderCosa } from './actions';

<TextDialog
    action={responderCosa.bind(null, cosa.id)}
    trigger="Responder"
    title={`Responder #${cosa.id}`}
    label="Respuesta"
    submitLabel="Responder"
/>
```

### H. Formulario con varios campos

Cuando no alcanza un solo texto. Archivo propio con `'use client'`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { anotarme } from './actions'; // (link, { name, email }) => back('POST', ...)

export function AnotarmeForm({ link }: { link: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
            const result = await anotarme(link, {
                name: String(form.get('name')),
                email: String(form.get('email')),
            });
            if (!result.ok) return setError(result.message);
            router.refresh();
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            {error && (
                <Alert variant="error">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button type="submit" loading={pending}>
                Anotarme
            </Button>
        </form>
    );
}
```

Cada `Input` necesita un `name`: es la clave con la que lo leés en `form.get(...)`. Para un número:
`Number(form.get('cantidad'))`.

### I. Mensaje fijo (aviso, éxito, vencido)

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/app/_components/ui/alert';

<Alert variant="warning">
    <AlertTitle>La oferta venció</AlertTitle>
    <AlertDescription>Se la ofrecimos a la siguiente persona de la lista.</AlertDescription>
</Alert>
```

Variantes de `Alert`: `default`, `info`, `success`, `warning`, `error`.

---

## 3. Ejemplo resuelto: Reclamos de un Turno atendido

Back (ya hecho, `agendic-back/src/infrastructure/reclamos/`):

| Endpoint | Auth | Devuelve |
|---|---|---|
| `POST /claims/:link` `{ reason }` | no | 201, o 422 si el Turno no fue atendido |
| `GET /claims/:link` | no | el Reclamo, o 404 si no hay |
| `GET /claims` | sí | `{ message, data: Reclamo[] }` |
| `PUT /claims/:id` `{ response }` | sí | el Reclamo, ya `CLOSED` |

| Punto de la consigna | Archivo | Snippets |
|---|---|---|
| 1. El Cliente reclama desde el Enlace del Turno | `app/turnos/[link]/reclamo/page.tsx` | A + F |
| 2. El Cliente ve el estado y la respuesta | la misma página | A + B |
| 3. El Dueño lista los abiertos y responde | `app/(app)/reclamos/page.tsx` | A + C + G |
| 4. No se puede reclamar un Turno no atendido | nada: el 422 del back se ve en el `TextForm` | — |

`app/turnos/[link]/reclamo/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';

export async function crearReclamo(link: string, reason: string) {
    return back('POST', `/claims/${link}`, { body: { reason } });
}
```

`app/turnos/[link]/reclamo/page.tsx`

```tsx
import { back } from '@/app/_components/back';
import { TextForm } from '@/app/_components/quick/TextForm';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { crearReclamo } from './actions';

type Reclamo = { id: number; status: 'OPEN' | 'CLOSED'; reason: string; response: string | null };

export default async function ReclamoPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;
    const result = await back<Reclamo>('GET', `/claims/${link}`);

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
            <h1 className="text-xl font-semibold">Reclamo del Turno</h1>

            {result.ok ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Tu reclamo</CardTitle>
                        <CardDescription>{result.data.reason}</CardDescription>
                        <CardAction>
                            <Badge variant={result.data.status === 'OPEN' ? 'secondary' : 'default'}>
                                {result.data.status === 'OPEN' ? 'Abierto' : 'Resuelto'}
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardContent>{result.data.response ?? 'El Negocio todavía no respondió.'}</CardContent>
                </Card>
            ) : result.status === 404 ? (
                <TextForm
                    action={crearReclamo.bind(null, link)}
                    label="¿Qué pasó con tu Turno?"
                    submitLabel="Enviar reclamo"
                />
            ) : (
                <Alert variant="error">
                    <AlertDescription>{result.message}</AlertDescription>
                </Alert>
            )}
        </main>
    );
}
```

`app/(app)/reclamos/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';

export async function responderReclamo(id: number, response: string) {
    return back('PUT', `/claims/${id}`, { body: { response }, auth: true });
}
```

`app/(app)/reclamos/page.tsx`

```tsx
import { back } from '@/app/_components/back';
import { TextDialog } from '@/app/_components/quick/TextDialog';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/app/_components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table';
import { responderReclamo } from './actions';

type Reclamo = { id: number; bookingId: number; status: 'OPEN' | 'CLOSED'; reason: string; createdAt: string };

export default async function ReclamosPage() {
    const result = await back<{ data: Reclamo[] }>('GET', '/claims', { auth: true });
    if (!result.ok) {
        return (
            <Alert variant="error">
                <AlertDescription>{result.message}</AlertDescription>
            </Alert>
        );
    }

    const abiertos = result.data.data.filter((reclamo) => reclamo.status === 'OPEN');

    return (
        <div className="flex flex-col gap-4 p-6">
            <h1 className="text-xl font-semibold">Reclamos abiertos</h1>

            {abiertos.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No hay Reclamos abiertos</EmptyTitle>
                        <EmptyDescription>Cuando un Cliente reclame un Turno, aparece acá.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Turno</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {abiertos.map((reclamo) => (
                            <TableRow key={reclamo.id}>
                                <TableCell>#{reclamo.bookingId}</TableCell>
                                <TableCell className="whitespace-normal">{reclamo.reason}</TableCell>
                                <TableCell>{new Date(reclamo.createdAt).toLocaleDateString('es-AR')}</TableCell>
                                <TableCell className="text-right">
                                    <TextDialog
                                        action={responderReclamo.bind(null, reclamo.id)}
                                        trigger="Responder"
                                        title={`Responder el reclamo #${reclamo.id}`}
                                        label="Respuesta"
                                        submitLabel="Responder y resolver"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
```

---

## 4. Cómo encarar otra consigna: Ofertas de un Turno liberado

Primero hacé el back. Después, para cada punto, preguntate *quién lo ve* y *qué toca*:

| Punto de la consigna | Pantalla | Snippets |
|---|---|---|
| 1. Anotarse a la lista de espera de un Turno tomado | Formulario donde el Cliente ve el Turno ocupado | H |
| 2. Consultar la oferta por un enlace seguro | `app/turnos/[link]/oferta/page.tsx` (o la ruta del enlace que genere tu back) | A + B o I |
| 3. Aceptar la oferta a tiempo | la misma página | E (`Aceptar`) |
| 4. Vencida → pasa al siguiente | nada en el front: el back lo procesa al consultar o aceptar | — |
| Validación: aceptar una oferta vencida | se ve el error del back debajo del botón de E | — |

Esqueleto de la página de la oferta:

```tsx
const result = await back<Oferta>('GET', `/offers/${link}`);
if (!result.ok) return <Alert variant="error"><AlertDescription>{result.message}</AlertDescription></Alert>;

const oferta = result.data;
return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
        <Card>
            <CardHeader>
                <CardTitle>Se liberó un Turno</CardTitle>
                <CardDescription>
                    {new Date(oferta.startsAt).toLocaleString('es-AR')} · vence a las{' '}
                    {new Date(oferta.expiresAt).toLocaleTimeString('es-AR')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {oferta.status === 'PENDING' ? (
                    <ActionButton action={aceptarOferta.bind(null, link)}>Aceptar el Turno</ActionButton>
                ) : (
                    <Badge variant="outline">{oferta.status}</Badge>
                )}
            </CardContent>
        </Card>
    </main>
);
```

---

## 5. ¿Te falta un componente?

Mirá los que ya hay en `app/_components/ui/` (alert, badge, button, card, checkbox, dialog, empty, input,
select, switch, table, tabs, textarea, tooltip...). Si el que necesitás no está, buscalo en
[coss.com/ui](https://coss.com/ui) y agregalo con:

```powershell
npx shadcn@latest add @coss/<nombre>
```

Se instala en `app/_components/ui/` (lo dice `components.json`). Copiá el ejemplo de uso de la página de coss.
Los componentes de coss usan Base UI: para que un botón abra algo se usa `render={<Button />}`, no `asChild`.

---

## 6. Si algo no anda

| Síntoma | Causa probable |
|---|---|
| `No se pudo conectar con el back` | El back no está levantado, o `API_URL` en `agendic-front/.env.local` apunta a otro puerto |
| Ves `Unauthorized` (401) | Endpoint con `ClerkGuard` y te olvidaste `auth: true` |
| Te manda a `/sign-in` | La página está en `app/(app)/` y no iniciaste sesión |
| 404 en todo | La ruta del `back(...)` no coincide con el `@Controller` + `@Get` del back |
| 400 `property x should not exist` | Mandaste un campo que el DTO del back no declara |
| La pantalla no se actualiza después de guardar | La plantilla hace `router.refresh()`; si escribiste tu propio form, agregalo |
| `Functions cannot be passed directly to Client Components` | Le pasaste una función común a una plantilla: tiene que ser una Server Action de un archivo con `'use server'` |
| `useState` / `onClick` no funciona | El archivo necesita `'use client'` arriba (las plantillas ya lo tienen; `page.tsx` no debe tenerlo) |
| Tipos raros | `npx tsc --noEmit` desde `agendic-front/` y arreglá lo que diga |

En desarrollo podés entrar sin Clerk: con `NEXT_PUBLIC_AUTH_OFFLINE=true` en `.env.local`, `/sign-in` te pide
solo el `clerkId` de un Usuario de la base.

---

## Qué deja afuera esta guía (a propósito)

El resto del front usa casos de uso, controllers, repositorios, Zod y clases de error en `src/`. Eso es lo
que harías para dejar la feature lista para producción. Esta guía es para ver la feature andando contra tu
back lo antes posible.
