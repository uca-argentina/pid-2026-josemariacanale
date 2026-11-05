# El calendario externo se conecta con OAuth propio, no a través de Clerk

Quien atiende Turnos puede conectar su Google Calendar o su Microsoft Calendar. El back hace su propio flujo OAuth contra Google y Microsoft y guarda el refresh token cifrado en Postgres. No usa la conexión del Proveedor de identidad de Clerk con scopes extra. El front lleva al navegador a la dirección que el back le da y lee el resultado en la query al volver.

Clerk ya habla con Google y Microsoft, y podría pedir `calendar.events` / `Calendars.ReadWrite` y darle el access token al back. Lo descartamos por tres motivos:

- **Ata el calendario a la cuenta con la que se Inicia sesión.** Quien entra con contraseña, o con su Gmail personal, no podría conectar el calendario del trabajo.
- **No anda en desarrollo.** Las credenciales compartidas de Clerk no aceptan scopes extra.
- **Se va con la baja.** Dar de baja borra al Usuario en Clerk (ADR 0024), y la integración desaparecería con él sin que el back se entere.

## Decisiones

- **Flujo de código con `access_type=offline` y `prompt=consent`**, para que Google entregue siempre un refresh token. Se piden los scopes mínimos: los ocupados y la lista de calendarios de la cuenta (`calendar.freebusy`, `calendar.calendarlist.readonly`), eventos (`calendar.events`) y `openid email` para saber qué cuenta se conectó.
- **El `state` va firmado y vence.** Es `<payload>.<firma>`: el payload lleva el Usuario y el vencimiento (10 minutos), la firma es HMAC-SHA256. El callback no tiene Sesión (lo abre Google), así que el `state` es lo único que dice a qué Usuario pertenece el permiso; uno manipulado o vencido no conecta nada.
- **El refresh token se guarda cifrado en Postgres** con AES-256-GCM y una clave del env (`CALENDAR_TOKEN_KEY`, 32 bytes en base64). Nunca sale en una respuesta ni en un log. La clave del `state` sale de la misma por HMAC, para no pedir otro secreto.
- **Una sola conexión por Usuario**, con un unique en `CalendarConnection.userId` (ADR 0004). Reconectar reemplaza la fila.
- **Estados `CONNECTED` y `DISCONNECTED`.** `DISCONNECTED` es una conexión que Google dejó de aceptar (por ejemplo, un token que venció en modo de prueba); se puede reconectar. Desconectar a mano borra la fila.
- **Desconectar revoca el token en Google.** Si la revocación falla se loguea y la conexión se borra igual. Dar de baja al Usuario (ADR 0024) también desconecta.
- **El callback siempre vuelve al front.** Responde 302 a `CALENDAR_RETURN_URL` con `?calendar=connected | denied | missing-scope | error`; ninguna falla del intercambio se muestra como JSON en el navegador. El callback lee sus parámetros uno por uno: Google suma otros (`scope`, `authuser`, `prompt`) que la validación global rechazaría.
- **Sin credenciales el back arranca igual**, como con los Días festivos (ADR 0028). `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `CALENDAR_RETURN_URL` y `CALENDAR_TOKEN_KEY` se leen al usarse, y sin alguna los endpoints que las necesitan responden 503.

## Microsoft (#402)

El Usuario puede conectar una cuenta de Microsoft (Outlook o Microsoft 365) en vez de una de Google, con el mismo flujo y el mismo `state`; sigue habiendo una sola conexión por Usuario. Los casos de uso hablan con un puerto sin proveedor y un enrutador manda cada llamada al cliente de Google o de Microsoft según la conexión.

- **Microsoft Graph, app multi-tenant (`common`)**, con scopes `openid email offline_access Calendars.ReadWrite`. Acepta cuentas personales y de trabajo; si una empresa exige el consentimiento de su administrador, el callback vuelve con `?calendar=denied`.
- **Credenciales propias**: `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` y `MICROSOFT_OAUTH_REDIRECT_URI`; `CALENDAR_RETURN_URL` y `CALENDAR_TOKEN_KEY` son los mismos. Sin ellas, los endpoints de Microsoft responden 503 y el de Google sigue andando.
- **Microsoft no revoca refresh tokens**: al desconectar solo se borra el token guardado (el Usuario puede quitar el permiso desde su cuenta de Microsoft).
- **El Cliente va en la descripción del evento y no como invitado**: Graph no deja crear un evento con invitados sin que Microsoft les mande la invitación. Ver `docs/agents/domain.md`.
- **Reemplazar un proveedor**: conectar Microsoft con un Google `DISCONNECTED` (o al revés) primero intenta borrar los Eventos del Turno futuros con el token viejo; si no se puede, se dejan.
- **Rotación del refresh token**: al renovar el acceso, Microsoft puede devolver un refresh token nuevo. Se guarda (`CalendarCredentials.onRefreshTokenRotated`, `CalendarConnectionsRepository.replaceRefreshToken`) para que la conexión no venza a los 90 días sin uso del token original. Si guardarlo falla, se loguea y se usa el acceso renovado igual.
- **Otra cuenta del mismo proveedor** se trata como un reemplazo: ver ADR 0038.

## Consecuencias

- El back necesita una app OAuth propia en Google Cloud y otra en Microsoft Entra, con sus secretos en el env. Igual que la key de Días festivos (ADR 0028), un entorno sin ellos arranca igual, sin la opción de conectar.
- El back es dueño del ciclo de vida del token: refresh, revocación al desconectar o al Dar de baja, y qué hacer cuando el proveedor lo invalida.
- Perder o rotar `CALENDAR_TOKEN_KEY` deja ilegibles los tokens guardados: los Usuarios tienen que reconectar.
- **La app de Google queda en modo de prueba.** El scope de calendario es sensible, y sin la verificación de Google (política de privacidad pública, dominio verificado y una revisión de semanas) solo pueden conectar los testers cargados a mano, hasta 100, y el refresh token vence a los 7 días. El Usuario ve su Calendario conectado como desconectado y lo vuelve a conectar. Verificar la app solo hace falta si Agendic sale a producción con usuarios reales. Microsoft no exige esto para cuentas personales; algunas cuentas de empresa piden una app con editor verificado o el consentimiento de su administrador.
- La conexión es del Usuario, no de su vínculo con un Negocio: una sola cubre todos los Turnos que atiende. Hay una sola a la vez, Google o Microsoft.
