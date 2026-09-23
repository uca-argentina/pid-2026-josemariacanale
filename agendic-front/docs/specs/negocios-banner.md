# Banner de Negocios en el panel y CTA para Crear Negocio

Labels: `ready-for-agent`

## Problem Statement

Un Usuario que inicia sesión entra al panel y ve pantallas con datos mock, sin saber si Agendic lo reconoce como Dueño de algún Negocio. Un Usuario recién registrado no tiene Negocios y nada en el panel lo guía a Crear Negocio. Hoy el front no consulta al back en ningún momento: no sabe si el Usuario tiene Negocios.

## Solution

Cada pantalla del panel consulta al back los Negocios del Usuario con Sesión:

- Si no tiene ninguno, se muestra arriba del contenido un aviso con un botón **Crear negocio**. El botón lleva a una página de onboarding que por ahora es un placeholder.
- Si tiene Negocios, se muestra un banner con la cantidad ("Tenés N negocio(s).").
- Si la consulta falla, no se muestra nada y el error se reporta.

Los datos mock de las pantallas se siguen mostrando igual en todos los casos. Más adelante el banner se reemplaza por los datos reales del Negocio.

## User Stories

1. Como Usuario sin Negocios, quiero ver en cualquier pantalla del panel un aviso de que todavía no tengo un Negocio, para entender por qué no hay datos míos.
2. Como Usuario sin Negocios, quiero un botón **Crear negocio** visible en todas las pantallas del panel, para empezar el alta desde donde esté.
3. Como Usuario sin Negocios, quiero que el botón me lleve a la página de onboarding, para completar ahí los datos del Negocio.
4. Como Usuario recién registrado que el back todavía no conoce, quiero ver el aviso de Crear Negocio y no un error, porque para mí es lo mismo que no tener Negocios.
5. Como Dueño, quiero ver en el panel un banner con cuántos Negocios tengo, para confirmar que Agendic me reconoce como Dueño.
6. Como Dueño, no quiero ver el aviso de Crear Negocio, porque ya tengo uno.
7. Como Dueño, no quiero que una caída del back me muestre "creá tu negocio", porque me haría creer que perdí mis datos.
8. Como Usuario, quiero que el panel siga funcionando si el back no responde, para seguir navegando aunque falten el aviso o el banner.
9. Como Usuario, quiero que la página de onboarding exija Sesión, para que nadie cree un Negocio a mi nombre sin estar identificado.
10. Como Usuario sin Sesión que entra a la página de onboarding, quiero que me mande a Iniciar sesión, igual que el resto del panel.
11. Como Usuario en la página de onboarding, quiero verla a pantalla completa sin el sidebar del panel, para concentrarme en el alta.
12. Como Usuario, quiero que el aviso o el banner aparezcan en todas las pantallas del panel (Turnos, Disponibilidad, Servicios, Profesionales, Sucursales, Clientes, Métricas), sin excepciones.
13. Como Usuario, quiero seguir viendo los datos de ejemplo de cada pantalla, sin importar si tengo Negocios, mientras el panel no muestre datos reales.
14. Como equipo, queremos que cada error inesperado del back quede reportado en el crash reporter, para detectar caídas sin depender de que un Usuario avise.
15. Como back, quiero recibir el JWT de Sesión de Clerk en cada request, para identificar al Usuario sin depender de un id compartido.

## Implementation Decisions

**Dominio**
- Se usa el término **Crear Negocio**, que ya está en el glosario. "Onboarding" es solo el nombre de la ruta, no un término de dominio.
- Hay una entidad nueva, **Negocio**, que por ahora tiene solo `id` (string) y `nombre` (string no vacío). El resto de los campos se agregan cuando alguna pantalla los necesite.

**Contrato con el back**
- La URL base sale de la variable de entorno `API_URL`. En local vale `http://localhost:3001`.
- `GET {API_URL}/businesses` con el header `Authorization: Bearer <JWT de Sesión de Clerk>`. El back identifica al Usuario por el token, así que el front no manda ningún id, y devuelve solo los Negocios de los que ese Usuario es Dueño (ADR 0010).
- Respuestas:
  - `200` con `[{ "id": number, "name": string, "description": string, "ownerId": number, "slug": string }]`, o `[]` si el Usuario no tiene Negocios. El adaptador se queda con lo que necesita.
  - Cualquier otro status, un error de red o un JSON que no respeta el esquema se traducen al error de persistencia de entities, con el error original como `cause`.
- Si `API_URL` no está definida, el adaptador tira un error y rige lo mismo que para una falla del back.

**Puertos**
- Hay un repositorio nuevo, `INegociosRepository`, con un solo método: `getMyNegocios(): Promise<Negocio[]>`.
- A `IAuthenticationService` se le agrega `getAccessToken(): Promise<string>`, que tira `UnauthenticatedError` si no hay Sesión. Así el SDK de Clerk se sigue importando del lado del servidor solo en `AuthenticationService`.

**Caso de uso**
- `listMyNegocios` recibe el `userId` ya verificado y devuelve `Negocio[]`. No hay chequeo de autorización extra, porque el back limita el resultado al Usuario del token.

**Adaptador**
- `NegociosRepository` implementa `INegociosRepository` con `fetch`, y recibe `IAuthenticationService` por constructor para obtener el token.
- Envuelve cada llamada en un span `'NegociosRepository > getMyNegocios'`.

**Controlador y presenter**
- `listMyNegocios` tiene este orden:
  1. autentica, y sin Sesión tira `UnauthenticatedError`;
  2. llama al caso de uso;
  3. el presenter devuelve solo `{ id, nombre }[]`.
- No recibe input, así que no tiene esquema de entrada.

**DI**
- Hay un módulo nuevo para negocios que registra el repositorio, el caso de uso y el controlador. Se registran en `DI_SYMBOLS` y `DI_RETURN_TYPES` con la clave `IListMyNegociosController`, además de las del repositorio y el caso de uso.
- El adaptador se enlaza directo a la clase real, sin ramas por `NODE_ENV`.

**Capa del framework**
- El layout del panel ya valida la Sesión. Ahora también obtiene el controlador y lo invoca una sola vez por render.
- El resultado va en un componente de servidor que se pinta arriba del contenido de cada página, antes del Topbar. No hay que tocar ninguna página.
- Si el controlador lanza un error, el layout lo reporta con `ICrashReporterService` y no muestra ni el aviso ni el banner.
- Textos:
  - Sin Negocios: "Todavía no tenés un negocio. Crealo para empezar a recibir turnos." y el botón **Crear negocio**.
  - Con Negocios: "Tenés N negocio(s)."
- `/onboarding` es un placeholder fuera del grupo del panel (sin sidebar). Valida la Sesión con el mismo helper de Usuario actual y, sin Sesión, redirige a Iniciar sesión.
- `API_URL` se agrega a la configuración de entorno.

## Testing Decisions

- Un buen test mira solo el comportamiento externo de cada pieza (qué devuelve y qué error tira dado lo que devuelven sus puertos), nunca los detalles internos.
- Cada test declara sus propios datos falsos y no comparte estado con los demás. No se usa base de datos ni red.
- **Controlador**: el caso de uso se pasa como `jest.fn()`. Casos:
  - feliz, donde el presenter deja solo `id` y `nombre` aunque el caso de uso devuelva más;
  - sin Sesión, donde tira `UnauthenticatedError` y el caso de uso no se llama.
- **Caso de uso**: el repositorio se stubea con un helper nuevo, `negociosWith`, que va en los stubs compartidos de tests con el mismo estilo que `authWith` (los métodos no stubeados rechazan). Casos:
  - Usuario con Negocios;
  - lista vacía.
- **Adaptador**: se stubean `fetch` y `authWith({ getAccessToken })`. Casos:
  - 200 devuelve la lista parseada;
  - 200 con `[]` devuelve lista vacía;
  - 500 tira el error de persistencia con `cause`;
  - JSON inválido tira el error de persistencia con `cause`;
  - `API_URL` ausente tira error;
  - el request lleva `Authorization: Bearer <token>`.
- **`authWith`**: se extiende para contemplar `getAccessToken`.
- **Adaptador de autenticación**: se agrega un test de `getAccessToken` con el SDK de Clerk stubeado, siguiendo el test existente del servicio de autenticación.
- **Contenedor**: el test existente resuelve también `IListMyNegociosController`.
- **Referencias en el repo**: el test del controlador de Usuario actual, el test del servicio de autenticación, el test del contenedor y los stubs compartidos.
- El layout, el banner y `/onboarding` no llevan tests unitarios, porque son de la capa del framework.

## Out of Scope

- El formulario de Crear Negocio y su endpoint: la página de onboarding es solo un placeholder.
- Mostrar los datos reales del Negocio en cada pantalla (se reemplazan los mocks más adelante).
- Elegir entre varios Negocios o cambiar de Negocio activo.
- La sincronización entre el Usuario de Clerk y el Usuario del back (ADR 0008). Hoy lo único pendiente es el refresco del nombre y el email desde los claims del token; no hay webhook (ADR 0009).
- Cachear la consulta entre navegaciones.
- Ocultar o deshabilitar funciones del panel para Usuarios sin Negocios.

## Further Notes

- No hay rama de 404: el back crea el Usuario la primera vez que ve su token (ADR 0009), así que un Usuario con Sesión siempre resuelve y, sin Negocios, devuelve `200 []`. Un `401` cae en el mismo camino que una falla del back.
- La regla "No mock adapter" se mantiene: el adaptador es HTTP real contra `API_URL`. Sin el back levantado en `localhost:3001`, el panel funciona sin aviso ni banner y el error queda reportado.
