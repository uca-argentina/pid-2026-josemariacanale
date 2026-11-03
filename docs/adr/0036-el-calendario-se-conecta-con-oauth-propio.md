# El calendario externo se conecta con OAuth propio, no a través de Clerk

Quien atiende Turnos puede conectar su Google Calendar o su Microsoft Calendar. El back hace su propio flujo OAuth contra Google y Microsoft y guarda el refresh token cifrado en Postgres. No usa la conexión del Proveedor de identidad de Clerk con scopes extra.

Clerk ya habla con Google y Microsoft, y podría pedir `calendar.events` / `Calendars.ReadWrite` y darle el access token al back. Lo descartamos por tres motivos:

- **Ata el calendario a la cuenta con la que se Inicia sesión.** Quien entra con contraseña, o con su Gmail personal, no podría conectar el calendario del trabajo.
- **No anda en desarrollo.** Las credenciales compartidas de Clerk no aceptan scopes extra.
- **Se va con la baja.** Dar de baja borra al Usuario en Clerk (ADR 0024), y la integración desaparecería con él sin que el back se entere.

## Consecuencias

- El back necesita una app OAuth propia en Google Cloud y otra en Microsoft Entra, con sus secretos en el env. Igual que la key de Días festivos (ADR 0028), un entorno sin ellos arranca igual, sin la opción de conectar.
- El back es dueño del ciclo de vida del token: refresh, revocación al desconectar o al Dar de baja, y qué hacer cuando el proveedor lo invalida.
- **La app de Google queda en modo de prueba.** El scope de calendario es sensible, y sin la verificación de Google (política de privacidad pública, dominio verificado y una revisión de semanas) solo pueden conectar los testers cargados a mano, hasta 100, y el refresh token vence a los 7 días. El Usuario ve su Calendario conectado como desconectado y lo vuelve a conectar. Verificar la app solo hace falta si Agendic sale a producción con usuarios reales. Microsoft no exige esto para cuentas personales; algunas cuentas de empresa piden una app con editor verificado o el consentimiento de su administrador.
- La conexión es del Usuario, no de su vínculo con un Negocio: una sola cubre todos los Turnos que atiende. Hay una sola a la vez, Google o Microsoft.
