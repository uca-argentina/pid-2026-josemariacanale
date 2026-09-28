# Reserva real por Sucursal: el Enlace de reserva llega hasta el Turno confirmado

Labels: `ready-for-agent`, `full-stack`

## Problem Statement

La página pública del Enlace de reserva (`BranchPublicPage` en el front) hoy es una maqueta: ruta estática (`/businessPage`), datos 100% mockeados (`mock-business.ts`), fotos de `picsum.photos`, y un flujo de reserva completo en UI que no llama a ningún endpoint real. La spec anterior (`docs/specs/enlace-de-reserva.md`) dejó a propósito fuera de scope completar la reserva y el slug de Sucursal; un intento posterior de conectarla a la API real (PR #17) se revirtió por eso mismo, no por un bug.

El back, en cambio, ya tiene casi todo el contrato que hace falta (ADR 0007): Negocio por slug, Sucursales de un Negocio, Servicios activos de una Sucursal con sus Empleados, Horarios reservables de un Servicio, y creación/verificación de Turno. Lo que falta es: (a) que la página pública identifique una Sucursal concreta, no solo un Negocio, (b) que esa Sucursal tenga imágenes reales, y (c) reconectar el front a ese contrato en vez de al mock.

## Solution

El Enlace de reserva gana un segundo tramo (ADR 0014): `/business/<negocio-slug>/<sucursal-slug>`. Esa página muestra las imágenes, los Servicios activos, los profesionales que los atienden, el horario de apertura/cierre y las demás Sucursales del Negocio — todo pedido al back — y desde ahí el Cliente elige Servicio, profesional y horario, y Reserva un Turno real contra `POST /bookings`.

Sucursal gana `slug` (único por Negocio) e imágenes (`BranchImage`, galería, en storage externo — ADR 0015). Servicio gana Seña (`depositPercent`, opcional) y Turno gana Comentario del Turno (`notes`, opcional): dos campos que el mock del front ya venía inventando y que pasan a ser dominio real.

## User Stories

1. Como Cliente, quiero abrir `/business/<negocio>/<sucursal>` y ver esa Sucursal concreta, no solo el Negocio, para saber que llegué al lugar correcto.
2. Como Cliente, quiero ver las imágenes reales de esa Sucursal, para conocerla antes de ir.
3. Como Cliente, quiero ver los Servicios activos de esa Sucursal con su duración, precio y Seña si tiene, para elegir cuál Reservar.
4. Como Cliente, quiero ver qué profesionales atienden cada Servicio de esa Sucursal, para elegir con quién.
5. Como Cliente, quiero ver el horario de apertura y cierre de la Sucursal, para saber cuándo puedo ir.
6. Como Cliente, quiero ver las demás Sucursales del Negocio y poder ir directo a la página de cualquiera de ellas, para elegir la que me quede mejor.
7. Como Cliente, quiero elegir un horario reservable real (no inventado) para el Servicio y el profesional que elegí, para no pedir algo que en realidad no está libre.
8. Como Cliente, quiero dejar un Comentario del Turno al Reservar, para avisarle algo puntual al Negocio (por ejemplo, una alergia).
9. Como Cliente, quiero que al confirmar quede creado un Turno real (`UNVERIFIED`, con su email de verificación), para que mi reserva cuente en la agenda del Negocio.
10. Como Cliente, quiero que si el horario se ocupó justo antes de que confirme, me lo digan y no me dejen reservar dos veces el mismo horario, para no llegar y encontrar el lugar ocupado.
11. Como Cliente que abre `/business/<negocio>` sin Sucursal y el Negocio tiene una sola, quiero llegar directo a ella, para no tener que elegir algo obvio.
12. Como Cliente que abre `/business/<negocio>` sin Sucursal y el Negocio tiene varias, quiero ver un selector de Sucursales, para elegir a cuál voy.
13. Como Cliente que abre una dirección de Sucursal que no existe (o que no es de ese Negocio), quiero un 404 claro.
14. Como Dueño, quiero elegir el `slug` de cada Sucursal al crearla o después, único dentro de mi Negocio, para armar su Enlace de reserva.
15. Como Dueño, quiero que me rechacen un `slug` de Sucursal repetido dentro de mi mismo Negocio, con un mensaje claro y no uno genérico.
16. Como Dueño, quiero subir varias imágenes a una Sucursal y ordenarlas, para que la página pública las muestre como yo decida.
17. Como Dueño, quiero borrar una imagen de mi Sucursal, para sacar una que ya no quiero mostrar.
18. Como Dueño, quiero que ningún otro Usuario pueda subir o borrar imágenes de mi Sucursal.
19. Como Dueño, quiero poder poner una Seña (porcentaje) en un Servicio, para pedir un adelanto al Reservar; y poder dejarlo sin Seña.
20. Como equipo, queremos que el contrato nuevo (slug de Sucursal, imágenes, Seña, Comentario del Turno) quede en ADR 0007, para que el front no tenga que leer el código del back.

## Implementation Decisions

### Dominio

- Términos nuevos en el glosario: **Seña** (`Service.depositPercent`) y **Comentario del Turno** (`Booking.notes`) — ver `CONTEXT.md`.
- **Enlace de reserva** se extiende: ahora tiene un tramo de Negocio y, cuando hace falta, uno de Sucursal — ver `CONTEXT.md` y ADR 0014.
- Los "profesionales que atienden la Sucursal" no son un concepto nuevo del dominio: se derivan de los Empleados que ya atienden algún Servicio de esa Sucursal (`EmployeeService` → `Service.branchId`). No hay `Employee.branchId` nuevo.
- ADR 0014 (tramo de Sucursal en el Enlace de reserva) y ADR 0015 (imágenes en storage externo) quedan registradas. Reabren dos puntos del Out of Scope de `docs/specs/enlace-de-reserva.md`.

### Esquema (back)

- `Branch` gana `slug` (`String`, `NOT NULL`), único compuesto con `businessId` (`@@unique([businessId, slug])`), mismo formato que `Business.slug` (`^[a-z0-9]+(-[a-z0-9]+)*$`, 3-40 caracteres, guardado en minúsculas).
- `BranchImage`: `id`, `branchId`, `url` (`String`), `order` (`Int`). `onDelete: Cascade` desde `Branch`.
- `Service` gana `depositPercent` (`Int?`, 0-100, `NULL` = sin Seña).
- `Booking` gana `notes` (`String?`, largo razonable, por ejemplo 500 caracteres, sin validación de contenido).

### Back: contrato a actualizar en ADR 0007

- `CreateBranchDto`/`UpdateBranchDto` suman `slug` (mismo formato y mensajes de error que `Business.slug`; 409 con "esa dirección ya está en uso" si choca con otro `slug` del mismo `businessId` — un mismo `slug` en Negocios distintos no es conflicto).
- `presentBranch` suma `slug`.
- `CreateServiceDto`/`UpdateServiceDto` suman `depositPercent?` (400 si está fuera de 0-100); `presentService` lo suma.
- `CreateBookingDto` suma `notes?`; `presentBooking` y `presentBookingForOwner` lo suman.
- Nuevo módulo de imágenes de Sucursal (mismo patrón de auth que el resto de Sucursal: solo el Dueño para escribir, público para leer):
  - `POST /branches/:id/images` (sí, solo Dueño) — sube una imagen (multipart), la guarda en el storage externo (ADR 0015) y crea el `BranchImage` con el `order` siguiente al último.
  - `DELETE /branches/:id/images/:imageId` (sí, solo Dueño) — borra el archivo del storage y la fila; 404 si la imagen no es de esa Sucursal.
  - `PUT /branches/:id/images/order` (sí, solo Dueño) — reemplaza el orden completo, mismo patrón que `PUT /employees/:id/overrides/:date`: recibe la lista completa de `imageId` en el orden deseado.
  - `GET /branches/:id/images` (no) — lista ordenada, público.
- Confirmar si `POST /bookings` ya devuelve 409 ante un choque de horario concurrente (el intento anterior lo manejaba como `SlotConflictError`); si el back ya lo tira pero ADR 0007 no lo documenta, es un hueco de doc a cerrar en este mismo ticket de back, no algo nuevo a implementar.

### Front: página pública

- Ruta dinámica `app/business/[negocioSlug]/[sucursalSlug]/`, reemplaza la ruta estática `businessPage/` y su mock (`mock-business.ts`, `types.ts` con los tres campos `ponytail` se resuelven: `depositPercent` y `notes` pasan a venir del back; las fotos de placeholder se reemplazan por `BranchImage`).
- `app/business/[negocioSlug]/page.tsx` (sin Sucursal): pide el Negocio y sus Sucursales; una sola → redirect a `/business/[negocioSlug]/[esa-sucursal]`; varias → selector.
- Ambas son server components: resuelven el controlador por DI, sin fetch propio, siguiendo `agendic-front/docs/agents/clean-architecture.md`. Sucursal o Negocio inexistente (o `sucursalSlug` que no es de ese Negocio) → 404 del framework.
- El flujo de reserva (`BookingFlow.tsx`, `TimeStep.tsx`, tipos en `types.ts`) se reconecta al contrato real: `GET /branches/:id/services` (empleados por servicio ya vienen embebidos), `GET /services/:id/slots`, `POST /bookings` (con `notes`), maneja el 409 de horario ocupado mostrando que hay que elegir otro horario.
- `MyBookings.tsx` queda fuera de este spec si no consume nada de lo de arriba (ver Out of Scope).

## Testing Decisions

Mismo criterio que la spec anterior: mirar comportamiento externo (qué devuelve/tira cada pieza dado lo que devuelven sus puertos), no detalles internos.

### Back

Seam existente (`createTestApp()` + repos mockeados + supertest para HTTP; tests de repositorio contra base real para lo que el mock no puede ver). Casos nuevos:

- Crear Sucursal con `slug` repetido en el mismo Negocio → 409; en Negocios distintos → 201 en ambos.
- Crear/actualizar Sucursal con `slug` mal formado → 400.
- Subir imagen a una Sucursal que no es del Dueño de la Sesión → 403.
- Borrar/reordenar una imagen que no pertenece a esa Sucursal → 404.
- Listar imágenes sin Sesión → 200, orden correcto.
- Crear/actualizar Servicio con `depositPercent` fuera de 0-100 → 400; sin `depositPercent` → sigue creando sin Seña.
- Crear Turno con `notes` → se guarda y viene en `presentBooking`; sin `notes` → sigue funcionando igual que hoy.
- (Si hace falta implementarlo) Dos `POST /bookings` concurrentes para el mismo horario → el segundo 409.

### Front

Tests unitarios por capa con puertos stubeados (prior art: los del controlador de Negocio por slug de la spec anterior):

- **Página `[negocioSlug]/[sucursalSlug]`**: Sucursal existente con Servicios/imágenes; Sucursal que no es de ese Negocio → not-found; Negocio inexistente → not-found.
- **Página `[negocioSlug]` sin Sucursal**: una sola Sucursal → redirect; varias → selector con los slugs correctos.
- **Caso de uso de reserva**: slots reales pedidos con el `employeeId`/rango correctos; `POST /bookings` con `notes` incluido cuando el Cliente lo escribió; 409 de horario ocupado propagado como error que la UI puede mostrar sin reportarlo al crash reporter (es esperable, no un bug).
- **Adaptadores**: mismo patrón que el resto (200 parseado, 404/409/500 mapeados a los errores de dominio correspondientes).

## Out of Scope

- Historial de `slug` de Sucursal o redirect del anterior (mismo criterio que `Business.slug`: al cambiarlo, el viejo muere).
- Reordenar imágenes con drag-and-drop en la UI del panel: alcanza con que el endpoint de orden exista: la UI del panel es otro ticket.
- Elegir proveedor de storage externo concreto y sus credenciales (ADR 0015 deja la puerta abierta; es una decisión de infraestructura, no de este spec).
- `MyBookings.tsx` (ver Turnos del Cliente ya hechos): no forma parte de completar una reserva nueva.
- Confirmación de asistencia y Aceptar/Rechazar turno pendiente: no aplican a este flujo (el Turno creado desde el Enlace de reserva queda `UNVERIFIED` → `BOOKED` al verificar el email, no pasa por un estado pendiente de aceptación del Negocio).
- Buscador o filtro de Servicios/profesionales dentro de la página pública: se listan todos los activos, sin buscador.
- SEO, metadatos de compartir, vista previa de la página pública (seguía fuera de scope en la spec anterior; sigue igual acá).

## Further Notes

- El intento anterior de conectar este mismo flujo (PR #17) se revirtió por alcance, no por un bug técnico: la spec vigente en ese momento (`docs/specs/enlace-de-reserva.md`) dejaba completar la reserva explícitamente afuera. Esta spec lo reabre a propósito (ver ADR 0014) — si se retoma código de ese PR, revisarlo contra el contrato de Servicio/Turno actualizado acá (`depositPercent`, `notes`, `Branch.slug`) antes de asumir que sigue vigente tal cual.
- Split de tickets: por convención del repo (`docs/agents/issue-tracker.md`), esto se parte en un ticket `back` (schema + endpoints + ADR 0007 actualizado) y uno `front` (rutas nuevas + reconexión del flujo de reserva), el de front bloqueado por el de back.
