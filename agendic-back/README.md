# agendic-back

## Setup

### Custom claims de Clerk

Para que el back refresque el nombre, el email y la foto de perfil del Usuario (y del Empleado) al vuelo, el session token de Clerk tiene que traer esos datos como custom claims. Configurarlo en el dashboard de Clerk, **Sessions → Customize session token**, agregando:

```json
{
  "name": "{{user.full_name}}",
  "email": "{{user.primary_email_address}}",
  "imageUrl": "{{user.image_url}}",
  "hasImage": "{{user.has_image}}"
}
```

``hasImage` evita guardar la imagen genérica de Clerk: en `false` la foto del Usuario pasa a `null`. Una URL que no se puede parsear se ignora y deja la foto guardada. La foto se refresca aparte del nombre y el email: sin `imageUrl` o sin `hasImage` en el token, solo esa parte queda sin refrescar.

Sin esta configuración (o con un token viejo que no la tiene todavía), el back sigue funcionando igual: no refresca nada y no llama a la API de Clerk.

### Baja de Usuarios

Un Usuario se da de baja desde Agendic (`DELETE /users/me`, ADR 0023): el back marca la fila y después borra su Usuario en Clerk. Para que no exista otro camino que borre la identidad sin pasar por el back, hay que **apagar "Allow users to delete their accounts"** en el dashboard de Clerk (**User & Authentication → Account deletion** o, según la versión del dashboard, **Configure → Account deletion**). Con eso encendido, el perfil de Clerk le ofrece al Usuario borrar su cuenta por fuera, sin cancelar sus Turnos ni dar de baja sus Servicios y Empleados.

> **Pendiente (producción):** este ajuste hay que hacerlo en la instancia de Clerk de **producción**, no solo en la de desarrollo. Hasta que se apague ahí, un Usuario de producción puede borrar su identidad desde el perfil de Clerk sin pasar por el back (queda el Negocio huérfano y los Turnos en pie). Tildar acá cuando esté hecho: `[ ]` "Allow users to delete their accounts" apagado en Clerk producción.

### Storage de archivos

Los archivos que se suben (por ejemplo, las imágenes de Sucursal) se guardan en un storage de objetos S3-compatible, no en el disco del back (ADR 0015). Sin estas variables el back no arranca y dice cuáles faltan:

| Variable | Qué es |
| --- | --- |
| `S3_ENDPOINT` | Endpoint S3 del proveedor. Se deja vacío solo para AWS S3. |
| `S3_REGION` | Región del bucket (`auto` en Cloudflare R2). |
| `S3_BUCKET` | Nombre del bucket. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credenciales con permiso de escritura y borrado sobre ese bucket. |
| `S3_PUBLIC_URL` | Dirección pública desde la que se sirven los objetos del bucket; el back devuelve `<S3_PUBLIC_URL>/<clave>`. |

Proveedor sugerido: **Cloudflare R2** (plan gratis y sin costo de egress). En el dashboard de R2:

1. Crear un bucket y habilitarle acceso público (dominio `r2.dev` o uno propio): esa dirección es `S3_PUBLIC_URL`.
2. **Manage R2 API Tokens** → crear un token con permiso *Object Read & Write* sobre ese bucket: da `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` y el endpoint `https://<account-id>.r2.cloudflarestorage.com` (`S3_ENDPOINT`).

Cualquier otro proveedor S3-compatible (AWS S3, Supabase Storage, MinIO) sirve cambiando solo estas variables. Los tests no las usan: corren contra un emulador S3 en proceso (`s3rver`).

### Turnos del Cliente

Reservar y el Enlace del Turno (ADR 0022) necesitan estas variables. Sin ellas el back no arranca y dice cuál falta:

| Variable | Qué es |
| --- | --- |
| `BOOKING_CODE_SECRET` | Secreto con el que se firman los Códigos de verificación del Cliente. Cualquier texto largo y aleatorio. |
| `FRONTEND_URL` | Dirección del front (por ejemplo `http://localhost:3000`). La Confirmación de reserva manda el Enlace del Turno como `<FRONTEND_URL>/turnos/<link>`. |

Para generar el secreto: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Cambiarlo solo invalida los códigos que estén en vuelo (duran 15 minutos). Los tests no lo usan: la app de test reemplaza los códigos y el mailer.
