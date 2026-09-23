# Enlace de reserva: el Negocio se comparte por URL y el listado deja de ser público

Labels: `ready-for-agent`, `back`, `front`

## Problem Statement

Hoy `GET /businesses` no pide Sesión y devuelve todos los Negocios de la plataforma. Dos problemas de una vez:

- El Dueño que entra al panel no tiene forma de pedir "mis Negocios": recibe también los de sus competidores, y el front tendría que filtrar con un dato que ni siquiera conoce.
- Cada Negocio queda enumerado ante cualquiera que llame al endpoint, sin haberlo pedido.

Del otro lado, un Negocio no tiene nada que compartir. No existe una dirección estable que pueda poner en su bio de Instagram, en un cartel o en un WhatsApp para que un Cliente entre a Reservar. La única forma de llegar a un Negocio es conocer su `id` numérico.

## Solution

`GET /businesses` pasa a requerir Sesión y devuelve únicamente los Negocios de los que el Usuario del token es Dueño. Deja de existir el catálogo público (ADR 0010).

En su lugar, cada Negocio tiene un **Enlace de reserva**: una dirección propia y única, del estilo `agendic.com/business/barberia-roma`. El Dueño elige esa parte final al Crear Negocio y puede cambiarla después. Quien abra el enlace —con Sesión o sin ella— ve el Negocio con sus Sucursales y sus Servicios activos, y desde ahí arranca a Reservar.

## User Stories

1. Como Dueño, quiero que `GET /businesses` me devuelva solo mis Negocios, para que el panel sepa cuáles son míos sin filtrar nada.
2. Como Dueño de varios Negocios, quiero recibirlos todos en esa misma respuesta, para poder elegir entre ellos más adelante.
3. Como Usuario sin Negocios, quiero recibir una lista vacía y no un error, porque no tener Negocios es un estado válido.
4. Como Usuario recién registrado que el back nunca vio, quiero recibir una lista vacía, porque el back me crea al ver mi token y para mí es lo mismo que no tener Negocios.
5. Como Usuario sin Sesión, quiero recibir un 401 al pedir el listado, para entender que hace falta identificarse y no que no hay Negocios.
6. Como Negocio, no quiero aparecer en ningún listado público de Agendic, para no quedar enumerado junto a mis competidores.
7. Como Dueño, quiero elegir yo la dirección de mi Enlace de reserva al Crear Negocio, para que diga el nombre de mi Negocio y no un número.
8. Como Dueño, quiero que me rechacen la dirección si ya la tomó otro Negocio, para enterarme antes de compartirla.
9. Como Dueño, quiero un mensaje que diga exactamente que la dirección está tomada, y no un error genérico, para probar con otra sin adivinar qué pasó.
10. Como Dueño, quiero que el formulario me deje escribir "Barbería Roma" y lo convierta en `barberia-roma`, para no pelearme con el formato.
11. Como Dueño, quiero que me rechacen una dirección con caracteres que no van, para no terminar con un enlace que no se puede compartir.
12. Como Dueño, quiero poder cambiar la dirección de mi Enlace de reserva después, para corregir un error o acompañar un cambio de nombre.
13. Como Dueño, quiero que me avisen que al cambiarla se rompen los enlaces que ya compartí, para decidir con eso a la vista.
14. Como Dueño, quiero que nadie más pueda cambiar la dirección de mi Negocio, porque es lo que sostiene todos mis enlaces.
15. Como Dueño, quiero ver mi Enlace de reserva completo en la respuesta del back, para copiarlo y compartirlo.
16. Como Cliente, quiero abrir el enlace que me pasó el Negocio y ver de qué Negocio se trata, para confirmar que llegué al lugar correcto.
17. Como Cliente sin Sesión, quiero ver esa página igual, porque no tengo por qué registrarme en Agendic para Reservar.
18. Como Cliente, quiero ver en esa página las Sucursales del Negocio, para elegir a cuál voy.
19. Como Cliente, quiero ver los Servicios activos de cada Sucursal con su duración y su precio, para elegir cuál Reservar.
20. Como Cliente, quiero ver el horario de apertura y cierre de cada Sucursal, para saber cuándo puedo ir.
21. Como Cliente, no quiero ver los Servicios dados de baja, porque no los puedo Reservar.
22. Como Cliente que abre un enlace con una dirección que no existe, quiero ver un 404 claro, para saber que el enlace está mal o venció.
23. Como Cliente, quiero que la dirección funcione sin importar mayúsculas o minúsculas, porque nadie copia un enlace con ese cuidado.
24. Como Cliente, quiero que la página del Negocio no dependa de estar identificado ni de ningún dato mío, para entrar directo desde el link.
25. Como equipo, queremos que el contrato de la API quede registrado en ADR 0007, para que el front no tenga que leer el código del back.
26. Como equipo, queremos que la decisión de no tener catálogo público quede registrada, para que nadie la "arregle" dentro de seis meses.

## Implementation Decisions

### Dominio

- Término nuevo en el glosario: **Enlace de reserva**, la dirección pública y única con la que un Negocio recibe Clientes. En el código es `Business.slug` (ver la tabla de identificadores en `docs/agents/domain.md`).
- "Slug" es el identificador del código, no un término de dominio: no aparece en textos de UI.
- Queda registrado en ADR 0010 (sin catálogo público de Negocios). ADR 0007 se actualiza a mano con el contrato nuevo.

### Esquema

- `Business` gana un campo `slug`, texto, `NOT NULL` y `@unique`. Sin base de datos con Negocios creados, la migración agrega columna e índice de una, sin backfill.
- El slug se guarda ya normalizado en minúsculas, así que el `@unique` plano alcanza: no hace falta un índice case-insensitive como los de `Service` y `Employee`.

### Formato y unicidad

- Formato válido: minúsculas, números y guiones simples entre segmentos (`^[a-z0-9]+(-[a-z0-9]+)*$`), de 3 a 40 caracteres. Sin acentos ni `ñ`.
- Lo valida el DTO de creación y el de actualización. Un slug mal formado es un 400 de validación, como cualquier otro campo.
- La unicidad la garantiza el índice, no una consulta previa: el repositorio traduce la violación del índice de `slug` a un conflicto con el mensaje "esa dirección ya está en uso", que sale como 409. No hay endpoint de disponibilidad ni chequeo en vivo mientras se escribe.
- Toda búsqueda por slug normaliza el parámetro a minúsculas antes de consultar, así que la URL funciona con cualquier combinación de mayúsculas.

### Back: listado del Dueño

- `GET /businesses` pasa a llevar `ClerkGuard` y a recibir el Usuario actual. El caso de uso de listar Negocios recibe ese `userId` y pide al repositorio los Negocios de ese Dueño.
- El repositorio cambia `list()` por un método que filtra por Dueño; el `findMany()` sin filtro desaparece, porque nadie lo usa más.
- Sin Sesión: 401, que es lo que ya producen `ClerkGuard` y el filtro de excepciones. Con Sesión y sin Negocios: `200 []`.

### Back: búsqueda por Enlace de reserva

- Endpoint público nuevo, `GET /businesses/by-slug/:slug`, sin guard. Dos segmentos, así que no compite con `GET /businesses/:id`.
- El repositorio gana un método que busca un Negocio por su slug; si no hay, es un 404 de dominio.
- Devuelve el Negocio y nada más. Las Sucursales y los Servicios los sigue sirviendo lo que ya existe y ya es público: el listado de Sucursales de un Negocio y el de Servicios activos de una Sucursal. No se crea ningún endpoint agregado.
- `GET /businesses/:id` sigue público, sin cambios.

### Back: creación y actualización

- El DTO de creación de Negocio suma `slug` como campo requerido dentro de los datos del Negocio.
- El DTO de actualización suma `slug` opcional, junto a `name` y `description`, con la misma regla de "solo el Dueño" que ya rige ahí. No se guarda historial de slugs: el anterior deja de funcionar.
- El presenter de Negocio suma `slug` a lo que devuelve.

### Front: página pública del Negocio

- Ruta dinámica `app/business/[slug]/`, fuera del grupo del panel y fuera del que exige Sesión. El prefijo `business` evita que la ruta dinámica compita con los segmentos del panel (`bookings`, `services`, `branches`, …).
- Es un server component: obtiene el controlador por inyección, le pasa el slug crudo y pinta el Negocio con sus Sucursales y sus Servicios. No llama al back por su cuenta.
- La pieza de core es un repositorio nuevo con dos operaciones —buscar Negocio por Enlace de reserva y traer sus Sucursales con sus Servicios—, su caso de uso y su controlador con presenter, registrados en el contenedor. Sin Sesión de por medio: el controlador no autentica, porque el endpoint es público.
- Negocio inexistente: la página responde 404 con el mecanismo del framework. Cualquier otro fallo se reporta por el crash reporter y muestra un mensaje genérico.

### Front: formulario y panel

- El formulario de Crear Negocio suma el campo del Enlace de reserva, mostrado como `agendic.com/business/` + lo que se escribe. El input normaliza mientras se tipea: a minúsculas y espacios a guiones.
- El 409 del back se muestra como error bajo ese campo, con el texto de dirección ya tomada; no se reporta al crash reporter, porque es un error esperable del Usuario.
- Donde se pueda editar el Enlace de reserva, el formulario advierte que los enlaces ya compartidos dejan de funcionar.
- El contrato del banner de Negocios (`agendic-front/docs/specs/negocios-banner.md`) ya quedó actualizado a `GET /businesses`: misma respuesta, sin rama de 404.

## Testing Decisions

Un buen test mira solo el comportamiento externo: qué devuelve y qué error tira cada pieza dado lo que devuelven sus puertos. Nunca sus detalles internos.

### Back

El seam es el que ya existe: la app completa levantada por `createTestApp()`, con cada repositorio como mock scripteado, y las llamadas HTTP con supertest. Prior art directo: el archivo de tests HTTP de Negocio, que ya cubre creación, actualización y los dos GET. Casos a cubrir ahí:

- Listado con Sesión: devuelve los Negocios que el repositorio da para ese Dueño, y el repositorio se llamó con el id del Usuario del token.
- Listado con Sesión de otro Usuario: devuelve lo suyo, no lo de Ana. Hay helpers para dos Sesiones distintas.
- Listado sin Sesión: 401 (hay que dar vuelta el test actual, que afirma que lista sin Sesión).
- Listado con Sesión y sin Negocios: `200 []`.
- Búsqueda por slug sin Sesión: 200 con el Negocio, y el repositorio recibió el slug normalizado.
- Búsqueda por slug con mayúsculas: mismo resultado.
- Búsqueda por un slug inexistente: 404.
- Creación sin `slug`, con slug mal formado, demasiado corto y demasiado largo: 400 en cada caso.
- Creación con un slug ya usado: 409 con el mensaje de dirección en uso.
- Actualización de slug por el Dueño: 200 con el slug nuevo. Por otro Usuario: 403.
- Actualización con slug mal formado: 400.

El único caso que el seam HTTP no puede ver es la persistencia, porque ahí el repositorio está mockeado. En los tests de repositorio contra base real (prior art: el archivo de tests del repositorio de Negocio) van:

- Buscar por slug devuelve el Negocio, y `null` si no existe.
- El listado por Dueño devuelve solo los de ese Dueño.
- Crear dos Negocios con el mismo slug rompe con el conflicto de dirección en uso, con ese mensaje y no con el genérico.

### Front

Tests unitarios por capa, con los puertos stubeados por caso y sin red ni base, siguiendo `clean-architecture.md`. Prior art: los tests del controlador de Usuario actual y los stubs compartidos.

- **Controlador**: camino feliz, donde el presenter deja solo lo que la página muestra; Negocio inexistente, donde propaga el error de no encontrado; slug con formato inválido, donde no se llama al caso de uso.
- **Caso de uso**: Negocio con Sucursales y Servicios; Negocio sin Sucursales; Negocio inexistente.
- **Adaptador**: `fetch` stubeado. 200 devuelve lo parseado; 404 tira el error de no encontrado; 500 y JSON inválido tiran el error de persistencia con `cause`; `API_URL` ausente tira error.
- **Contenedor**: el test existente resuelve también el controlador nuevo.
- La página, el layout y el formulario no llevan test unitario: son capa de framework.

## Out of Scope

- Historial de slugs y redirect del Enlace de reserva anterior. Al cambiarlo, el viejo muere.
- Chequeo de disponibilidad en vivo mientras se escribe el slug, con tilde verde. El 409 al enviar alcanza.
- Slug propio de Sucursal o de Servicio (`/business/barberia-roma/corte`). Por ahora el Enlace de reserva llega al Negocio.
- Visibilidad de un Servicio más allá de estar dado de baja. "Público" se entiende como "activo"; no hay flag de ocultar.
- Elegir horario y completar la reserva desde la página del Enlace de reserva: esta spec llega hasta mostrar Sucursales y Servicios. La reserva sigue siendo el endpoint de Turnos, que ya existe.
- Cualquier listado de todos los Negocios para el Administrador: si hace falta, es su propio endpoint.
- Dominio propio del Negocio (`turnos.barberiaroma.com`).
- Vista previa, SEO, metadatos de compartir y foto de portada de la página del Negocio.

## Further Notes

- El endpoint público por slug expone el nombre, la descripción y el `ownerId` de un Negocio a quien acierte una dirección. Es el mismo dato que ya expone `GET /businesses/:id` por id numérico, con la diferencia de que un slug es más fácil de adivinar que un id. Si alguna vez hay que recortar el presenter público, se recorta para los dos.
- Derivar el slug del nombre automáticamente se descartó a propósito: el Dueño lo escribe. Si resulta que la mayoría acepta lo primero que se le sugiera, se puede precargar el campo con el nombre normalizado sin cambiar nada del contrato.
