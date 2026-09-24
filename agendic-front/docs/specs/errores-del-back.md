# Errores del back: pantalla de error contenida en vez de la caída total

Labels: `ready-for-agent`

## Problem Statement

Cuando el back falla (no responde, la Sesión no es válida, la base está caída), la excepción llega sin atrapar hasta el renderizado y el Usuario ve una página de error que reemplaza toda la pantalla. No hay ningún `error.tsx` en el front. Además `ApiRequestError` guarda solo el mensaje y pierde el status HTTP, así que el front no puede distinguir una Sesión vencida de una caída, y los mensajes técnicos del back ("Database operation failed", "Invalid or expired Clerk token") son lo único que hay para mostrar.

## Solution

Los errores del back dejan de tumbar la aplicación y tampoco se silencian:

- Un error de la API se clasifica por su status: `401` es una Sesión inválida o vencida, cualquier otro caso (5xx, red caída, JSON inválido) es una falla del back.
- Un `401` manda a Iniciar sesión.
- Una falla del back muestra un aviso con texto propio en español y un botón **Reintentar**, sin mostrar el mensaje del back. En el panel el aviso aparece dentro de la pantalla y el resto del layout sigue usable. Como red de seguridad, un `error.tsx` a nivel de `app/` cubre lo que no esté atrapado.
- El mensaje técnico del back se reporta en el servidor, nunca al Usuario.
- Un error con mensaje pensado para el Usuario (por ejemplo el 409 de Enlace de reserva en uso) sigue mostrándose bajo el campo, como hoy.
- Ante una falla al consultar los Negocios del Usuario en `/onboarding`, no se muestra nunca el formulario de Crear Negocio.

## User Stories

1. Como Usuario, quiero que una caída del back no me reemplace toda la pantalla, para poder seguir navegando.
2. Como Usuario, quiero ver un mensaje claro en español ("No pudimos cargar tus datos, probá de nuevo") cuando el back falla, en vez de un texto técnico.
3. Como Usuario, quiero un botón **Reintentar** en ese aviso, para volver a pedir los datos sin recargar toda la página.
4. Como Usuario cuya Sesión venció, quiero que me manden a Iniciar sesión en vez de ver un error, porque puedo resolverlo yo solo.
5. Como Dueño, no quiero que una falla al consultar mis Negocios me muestre el formulario de Crear Negocio, porque me haría creer que no tengo uno (ADR 0012).
6. Como Usuario que completa un formulario, quiero seguir viendo los errores de validación o de Enlace de reserva en uso bajo el campo correspondiente, y que no los reemplace el aviso general.
7. Como equipo, queremos que cada falla del back quede reportada en el crash reporter con su mensaje original, para detectar caídas sin depender de que un Usuario avise.
8. Como equipo, queremos que el front conozca el status de la respuesta cuando falla la API, para decidir qué mostrar sin parsear mensajes.

## Implementation Decisions

**Dominio**
- No hay términos nuevos en el glosario. Se usan **Sesión**, **Iniciar sesión**, **Crear Negocio**, **Dueño**. No hace falta un ADR: la decisión es reversible.

**Error de la API**
- `ApiRequestError` gana un `status` opcional. Está definido cuando hubo respuesta HTTP; está ausente cuando no la hubo (red caída, `API_URL` sin definir) o cuando el JSON no respeta el esquema. Es una sola clase, sin subclases por tipo.
- Los adaptadores que llaman a la API completan el `status` al construir el error. El mensaje del back se conserva en `message` para el reporte, pero la interfaz no lo muestra.

**Clasificación**
- `status === 401`: Sesión inválida o vencida, se redirige a Iniciar sesión.
- Cualquier otro caso: falla del back, se muestra el aviso con **Reintentar**.
- Excepción: los errores con mensaje para el Usuario (409 de Enlace de reserva, validaciones) los maneja la propia acción del formulario y se muestran bajo el campo. No llegan al aviso general.

**Capa del framework**
- Un `error.tsx` en la raíz de `app/` muestra el aviso general con **Reintentar** (`reset()`), como red de seguridad. Un `error.tsx` dentro del grupo del panel muestra el mismo aviso dentro del layout, para que el sidebar siga visible.
- Un `401` que llegue al boundary se traduce en una redirección a Iniciar sesión, no en el aviso.
- El texto del aviso es propio del front. Nunca se interpola `error.message`.
- `/onboarding`: si falla la consulta de Negocios del Usuario, se muestra el aviso con **Reintentar** y no el formulario de Crear Negocio. El formulario solo aparece cuando el back respondió `200 []`.
- Los errores atrapados se siguen reportando con el crash reporter del servidor, con el mensaje y la causa originales.

## Testing Decisions

- Un buen test mira solo el comportamiento externo: qué error tira o qué devuelve cada pieza dado lo que devuelven sus puertos, sin depender de detalles internos. Cada test declara sus propios datos falsos, sin base de datos ni red.
- **Adaptador de Negocios**: se extienden los casos existentes.
  - 500 tira `ApiRequestError` con `status: 500`;
  - 401 tira `ApiRequestError` con `status: 401`;
  - error de red tira `ApiRequestError` sin `status` y con `cause`;
  - JSON inválido tira `ApiRequestError` sin `status`.
- **Referencias en el repo**: el test existente del adaptador de Negocios y sus stubs de `fetch`.
- Los `error.tsx`, el aviso y `/onboarding` no llevan tests unitarios, porque son de la capa del framework.

## Out of Scope

- Reintentos automáticos o backoff.
- Un sistema de toasts o notificaciones globales.
- Modo offline o caché de la última respuesta buena.
- Traducir o mapear cada mensaje del back a un texto propio: solo hay un texto general para las fallas del back.
- Cambios en el back. El contrato actual (status HTTP y `message`) alcanza.

## Further Notes

- En desarrollo Next sigue mostrando su overlay de error aunque haya `error.tsx`. Es intencional y no se desactiva.
- Este spec reemplaza el criterio "si la consulta falla, no se muestra nada" de `negocios-banner.md` para el banner del panel: ahora la falla se comunica con el aviso en lugar de ocultarse. Conviene revisar ese caso al implementarlo.
