# La pantalla de Horas laborables se copia de cal.diy

La pantalla de Horas laborables del front (y el selector de zona horaria que usa todo el panel) se copia del código de cal.diy (MIT, commit `54343aa`) en vez de restylear la que había. Solo aplica al front; el back no cambia ni consume contratos nuevos.

Motivos:

- **Copiar y no restylear.** La pantalla anterior era propia y le faltaban cosas que cal.diy ya resolvió y probó con usuarios: preferencias de hora y semana, búsqueda de zonas por ciudad, Anulaciones con calendario. Restylearla era rehacer ese comportamiento a mano; copiarlo lo trae hecho y solo hay que adaptarlo.
- **Se adapta, no se trasplanta.** Los primitivos de `@calcom/ui` se reemplazan por los del design system, los colores son los del panel, los textos van en castellano con el vocabulario de `CONTEXT.md`, y se sacan tRPC, `useLocale`, los shells y todo lo de plataforma. Un componente nunca llama al back: los datos llegan por props y las acciones son las acciones de servidor.
- **Sin aviso de licencia en los archivos copiados.** Decidido así.

## Dependencias que suma el spec

`react-hook-form`, `react-select`, `dayjs` y `react-day-picker`. Con este ADR llegan `react-select` y `dayjs`; `react-hook-form` llega con los días y Franjas del editor; el resto lo suman los tickets que copian el calendario.

## La grilla semanal de Mis turnos

La vista calendario de Mis turnos se copia con el mismo criterio de `weeklyview` de cal.diy: la lógica de `packages/features/calendars/weeklyview` (el solapamiento de `overlap.ts` con su test, los utils y los tipos) y los componentes de `apps/web/modules/calendars/weeklyview`. Al copiarla:

- el store de zustand se reemplaza por props;
- `@calcom/dayjs` pasa a ser `dayjs` con `utc` y `timezone`;
- `classNames` pasa a ser `cn`;
- los tokens de color de cal se cambian por los del panel;
- `useTimePreferences` se cambia por las Preferencias del Usuario.

No se copian `BlockedList` (en cal.diy está comentado) ni `OutOfOfficeInSlots`.

## Qué no se copia

Lo que cal.diy tiene y el spec deja afuera: el toggle de disponibilidad del equipo, "Solucionador de problemas", "Actualización masiva de predeterminados" y "Duplicar".

## Selector de zona horaria

Es un combobox de Base UI (`Combobox`) en crear y editar Horas laborables, el formulario de Sucursal y Crear Negocio: se escribe para filtrar. El valor sigue siendo el identificador IANA (`America/Argentina/Buenos_Aires`). Sin el endpoint de ciudades de cal.diy, la lista sale de `Intl.supportedValuesOf('timeZone')` y la búsqueda mira el nombre de la zona más las etiquetas fijas de cal.diy. En un principio se usó `react-timezone-select`; se cambió a combobox para que el selector se escriba y busque igual en todo el panel.
