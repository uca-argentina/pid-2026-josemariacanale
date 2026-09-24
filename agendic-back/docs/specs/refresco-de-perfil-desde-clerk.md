# Refresco del nombre y el email del Usuario y del Empleado desde Clerk

> Nota: la parte del Empleado quedó sin efecto: el Empleado dejó de ser una identidad de Clerk (ADR 0011).

Labels: `ready-for-agent`, `area:back`

## Problem Statement

El back copia el nombre y el email del Proveedor de autenticación una sola vez, cuando ve por primera vez a un Usuario o a un Empleado, y después nunca más. Si la persona cambia su nombre o su email en Clerk, Postgres se queda con el viejo para siempre: el panel la sigue saludando con el nombre anterior, el email que se muestra en el perfil es el que ya no usa, y un Dueño que Crea Negocio queda dado de alta como Empleado con una dirección que no le llega.

No hay hoy ningún camino por el que ese cambio entre al back. ADR 0009 decide que tampoco va a entrar por un webhook.

## Solution

Cada request ya trae el JWT de Clerk y ya pasa por el caso de uso que resuelve al Usuario (o al Empleado) actual. Ese mismo camino pasa a comparar el nombre y el email que viene en el token con los que tiene la fila, y los actualiza cuando difieren.

El nombre y el email viajan como claims del session token, configurados en el dashboard de Clerk. Así el refresco no cuesta ni una llamada más a Clerk ni un endpoint nuevo: es una comparación sobre datos que ya llegaron. Si los claims no están (token viejo, o configuración todavía sin aplicar), no se refresca nada y todo sigue funcionando como hoy.

## User Stories

1. Como Usuario que cambió su nombre en Clerk, quiero que Agendic me salude con el nombre nuevo la próxima vez que entro, para no ver un dato que ya corregí.
2. Como Usuario que cambió su email en Clerk, quiero que el email que Agendic muestra de mí sea el nuevo, para saber a dónde me van a llegar los avisos.
3. Como Usuario, quiero que ese refresco pase solo, sin tener que editar mi perfil en Agendic, para no mantener el mismo dato en dos lugares.
4. Como Usuario que no cambió nada, quiero que mis datos queden exactamente igual, para que entrar al panel no escriba en la base sin motivo.
5. Como Usuario, quiero que el panel siga respondiendo igual de rápido, para que el refresco no me agregue espera en cada pantalla.
6. Como Empleado de un Negocio, quiero que mi nombre y mi email en el Staff se mantengan al día con los de Clerk, para que el Negocio me contacte a la dirección correcta.
7. Como Empleado, quiero que mis Turnos, mi antigüedad y mi baja no se toquen cuando se refresca mi perfil, porque solo cambió cómo me llamo.
8. Como Empleado cuyo email nuevo ya lo tiene otro Empleado del mismo Negocio, quiero poder seguir entrando igual, para que un choque de emails no me deje afuera.
9. Como Dueño, quiero que el Empleado que Agendic creó para mí al Crear Negocio también se mantenga al día, para no quedar con dos versiones de mis datos.
10. Como Usuario que se registra por primera vez, quiero que mi Usuario se siga creando en mi primer request, para entrar sin esperar ninguna sincronización.
11. Como Usuario, quiero que un token sin los claims de perfil me deje entrar igual, para que un cambio de configuración de Clerk no me bloquee la Sesión.
12. Como equipo, queremos que el refresco no agregue llamadas a la API de Clerk, para no chocar con sus límites de uso en cada request.
13. Como equipo, queremos que no exista ningún endpoint público de webhook, para no tener que verificar firmas ni tolerar reintentos (ADR 0009).
14. Como equipo, queremos que una falla al refrescar no tumbe el request, porque el Usuario ya está identificado y el perfil viejo alcanza para atenderlo.
15. Como Administrador, quiero que el dato desactualizado se corrija al próximo request de esa persona, para no tener que tocar la base a mano.

## Implementation Decisions

**Origen del perfil**
- El nombre y el email se leen de los claims del session token de Clerk, no de la API de Clerk. Requiere configurar los custom claims del session token en el dashboard de Clerk; queda documentado en el README del back como paso de setup.
- `ClerkIdentity` (el resultado de verificar el token) suma el perfil que viene en el token, opcional: ausente cuando los claims no están.
- `getProfile` sigue existiendo y sigue usándose para sembrar el Usuario o el Empleado cuando el token no trae los claims. Es el único camino que llama a la API de Clerk.

**Refresco**
- El caso de uso que resuelve al Usuario actual, después de encontrar la fila por `clerkId`, compara nombre y email con los del token. Si alguno difiere, actualiza y devuelve la fila actualizada. Si no, devuelve la que encontró, sin escribir.
- El caso de uso que resuelve al Empleado actual hace lo mismo sobre su fila.
- La comparación de email es exacta, sin normalizar: Clerk es la fuente, y lo que mande es lo que se guarda.
- Un perfil ausente en el token equivale a "no cambió nada": no se refresca ni se llama a la API de Clerk.

**Puertos**
- `UsersRepository.update` y `EmployeesRepository.update` pasan a aceptar también `email`, además de `name`. Siguen dejando sin tocar los campos no enviados.
- No hay puertos ni módulos nuevos. No hay endpoint nuevo.

**Conflicto de email en Empleados**
- El email de un Empleado es único, sin importar mayúsculas, entre los Empleados no dados de baja de un mismo Negocio. Un refresco puede chocar con esa regla.
- Cuando el refresco del Empleado da conflicto, se descarta el refresco y el request sigue con la fila vieja. El Empleado nunca queda sin poder entrar por este motivo.
- El refresco del Usuario no tiene esta ramificación: `User.email` no es único.

**Esquema**
- Ninguna migración. Las columnas ya existen.

## Testing Decisions

- Un buen test mira el comportamiento externo de la pieza: qué devuelve la API y qué quedó escrito en los puertos, nunca cómo lo hizo por dentro.
- El seam es el que ya usa todo el back: `createTestApp()`, la app completa con cada puerto de salida mockeado, ejercitada por HTTP con supertest. No se agrega ningún seam nuevo. Prior art: `users.http.spec.ts` y `employees.http.spec.ts`, que ya scriptean `ClerkAuth` y los repositorios.
- **Specs HTTP de Usuarios**, sobre un endpoint cualquiera detrás del guard:
  - el token trae nombre y email distintos a los de la fila: la respuesta muestra los nuevos y el repositorio recibió el `update`;
  - el token trae los mismos datos: no se llama a `update`;
  - el token no trae claims de perfil: no se llama a `update` ni a `getProfile`;
  - primer request de un `clerkId` desconocido: se crea la fila, como hoy.
- **Specs HTTP de Empleados**: los mismos casos, más el conflicto de email, donde el `update` rechaza con el error de conflicto y el request igual responde bien, con los datos viejos.
- **Repositorios Prisma**: se extienden los tests existentes de `update` en `prisma-users.repository.spec.ts` y `prisma-employees.repository.spec.ts` para cubrir el email, incluido el choque con la restricción de unicidad del Empleado.
- No hay tests dedicados al adaptador de Clerk: leer un claim de un payload ya verificado no tiene lógica propia.

## Out of Scope

- Cualquier webhook de Clerk, incluidos `user.created`, `user.updated` y `user.deleted` (ADR 0009).
- Qué pasa con un Negocio cuyo Dueño borró su cuenta en Clerk: queda huérfano a propósito, y darlo de baja desde Agendic es otro spec.
- Refrescar datos de una persona que no vuelve a entrar: se corrige recién en su próximo request.
- Sincronizar la Organización de Clerk con el Negocio, o la membresía con el Staff.
- Refrescar cualquier campo que no sea nombre y email.
- Que el Usuario edite su nombre desde Agendic y eso se propague hacia Clerk: hoy el flujo es en un solo sentido.

## Further Notes

- El spec del front `negocios-banner.md` dice que la sincronización entre Clerk y el back está pendiente y cita "ADR 0003"; la referencia correcta es ADR 0008, y lo que está pendiente hoy es solo esto. Conviene corregir esa línea cuando se toque ese spec.
- Si más adelante los claims del token resultan incómodos de mantener en el dashboard, el fallback barato es llamar a `getProfile` cuando la fila tenga más de N días sin refrescarse. No se hace ahora porque agrega una columna y una llamada a Clerk por algo que el token ya trae gratis.
