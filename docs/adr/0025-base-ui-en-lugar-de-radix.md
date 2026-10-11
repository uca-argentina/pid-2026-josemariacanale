# Base UI en lugar de Radix para los primitivos del front

Solo aplica al front (`agendic-front/`); el back no tiene primitivos de UI.

Hacía falta un NumberField y Radix no lo tiene. Base UI sí, y shadcn publica el mismo design system sobre Base UI (`base-nova`).

El front pasa de Radix (`radix-nova`) a Base UI como librería de primitivos:

- **shadcn sobre Base UI.** `components.json` usa `base-nova`; los primitivos de `app/_components/ui/` se regeneraron con el CLI y se volvieron a aplicar a mano las personalizaciones locales (menú desplegable, textos del sidebar en español).
- **Migración de una sola vez.** Radix y Base UI no conviven: se sacan `radix-ui` y `vaul` (nadie importaba `vaul`) en el mismo PR que mueve todos los usos directos (`Popover`, `Tabs`, `Select`, `Dialog`, `AlertDialog`, menús, `Switch`, `Checkbox`).
- **`render` en lugar de `asChild`.** Se reescribió cada `asChild` con la prop `render` de Base UI, sin wrapper de compatibilidad. Un `Button` que renderiza un `Link` lleva `nativeButton={false}`.

`cmdk` y el combobox de zona horaria quedan como estaban; solo cambió el `Popover` que lo envuelve.

## Consecuencias

- Los estados visuales salen de `data-checked`, `data-active`, `data-open` y `data-popup-open`, no de `data-state`.
- `onSelect` de un ítem de menú es `onClick`; `onOpenAutoFocus` / `onCloseAutoFocus` son `initialFocus` / `finalFocus`.
- `Select` entrega `null` cuando se limpia; el `ToggleGroup` maneja un arreglo de valores.
