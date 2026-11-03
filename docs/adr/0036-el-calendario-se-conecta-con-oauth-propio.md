# El Calendario se conecta con un OAuth propio del back

El Calendario conectado (Google, y después Microsoft) necesita permisos que el login de Clerk no pide, y un refresh token que sobreviva a la Sesión: el back lo usa solo, sin Usuario delante, para leer los Ocupados externos y escribir Eventos del Turno. Clerk guarda las credenciales de la identidad, no un token de larga vida para llamar a la API de Calendar con scopes propios, y atarlo a Clerk haría que desconectar el calendario dependiera de cerrar la cuenta.

Por eso el back hace su propio flujo OAuth contra Google, con un cliente OAuth propio. Solo aplica al back; el front lleva al navegador a la dirección que el back le da y lee el resultado en la query al volver.

## Decisiones

- **Flujo de código con `access_type=offline` y `prompt=consent`**, para que Google entregue siempre un refresh token. Se piden los scopes mínimos: los ocupados y la lista de calendarios de la cuenta (`calendar.freebusy`, `calendar.calendarlist.readonly`), eventos (`calendar.events`) y `openid email` para saber qué cuenta se conectó.
- **El `state` va firmado y vence.** Es `<payload>.<firma>`: el payload lleva el Usuario y el vencimiento (10 minutos), la firma es HMAC-SHA256. El callback no tiene Sesión (lo abre Google), así que el `state` es lo único que dice a qué Usuario pertenece el permiso; uno manipulado o vencido no conecta nada.
- **El refresh token se guarda cifrado en Postgres** con AES-256-GCM y una clave del env (`CALENDAR_TOKEN_KEY`, 32 bytes en base64). Nunca sale en una respuesta ni en un log. La clave del `state` sale de la misma por HMAC, para no pedir otro secreto.
- **Una sola conexión por Usuario**, con un unique en `CalendarConnection.userId` (ADR 0004). Reconectar reemplaza la fila.
- **Estados `CONNECTED` y `DISCONNECTED`.** `DISCONNECTED` es una conexión que Google dejó de aceptar (por ejemplo, un token que venció en modo de prueba); se puede reconectar. Desconectar a mano borra la fila.
- **Desconectar revoca el token en Google.** Si la revocación falla se loguea y la conexión se borra igual. Dar de baja al Usuario (ADR 0024) también desconecta.
- **El callback siempre vuelve al front.** Responde 302 a `CALENDAR_RETURN_URL` con `?calendar=connected | denied | missing-scope | error`; ninguna falla del intercambio se muestra como JSON en el navegador. El callback lee sus parámetros uno por uno: Google suma otros (`scope`, `authuser`, `prompt`) que la validación global rechazaría.
- **Sin credenciales el back arranca igual**, como con los Días festivos (ADR 0028). `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `CALENDAR_RETURN_URL` y `CALENDAR_TOKEN_KEY` se leen al usarse, y sin alguna los endpoints que las necesitan responden 503.

## Consecuencias

- Mientras la app de Google no esté verificada, funciona en modo de prueba: los testers se cargan a mano en la consola de Google y el refresh token vence a los 7 días, así que hay que reconectar.
- Perder o rotar `CALENDAR_TOKEN_KEY` deja ilegibles los tokens guardados: los Usuarios tienen que reconectar.
