# La pantalla de Horas laborables se copia de cal.diy

La pantalla de Horas laborables del front (y el selector de zona horaria que usa todo el panel) se copia del código de cal.diy (MIT, commit `54343aa`) en vez de restylear la que había. Solo aplica al front; el back no cambia ni consume contratos nuevos.

Motivos:

- **Copiar y no restylear.** La pantalla anterior era propia y le faltaban cosas que cal.diy ya resolvió y probó con usuarios: preferencias de hora y semana, búsqueda de zonas por ciudad, Anulaciones con calendario. Restylearla era rehacer ese comportamiento a mano; copiarlo lo trae hecho y solo hay que adaptarlo.
- **Se adapta, no se trasplanta.** Los primitivos de `@calcom/ui` se reemplazan por los del design system, los colores son los del panel, los textos van en castellano con el vocabulario de `CONTEXT.md`, y se sacan tRPC, `useLocale`, los shells y todo lo de plataforma. Un componente nunca llama al back: los datos llegan por props y las acciones son las acciones de servidor.
- **Sin aviso de licencia en los archivos copiados.** Decidido así.

## Dependencias que suma el spec

`react-hook-form`, `react-select`, `react-timezone-select`, `dayjs` y `react-day-picker`. Las dos primeras de selector llegan con este ADR (`react-select`, `react-timezone-select`, `dayjs`); el resto las suman los tickets que copian el formulario y el calendario.

## Qué no se copia

Lo que cal.diy tiene y el spec deja afuera: el toggle de disponibilidad del equipo, "Solucionador de problemas", "Actualización masiva de predeterminados" y "Duplicar".

## Selector de zona horaria

Reemplaza al combobox anterior en crear y editar Horas laborables, el formulario de Sucursal y Crear Negocio. El valor sigue siendo el identificador IANA (`America/Argentina/Buenos_Aires`). Sin el endpoint de ciudades de cal.diy, la búsqueda usa la lista de `react-timezone-select` más las etiquetas fijas de cal.diy.
