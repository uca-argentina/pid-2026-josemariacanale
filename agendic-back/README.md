# agendic-back

## Setup

### Custom claims de Clerk

Para que el back refresque el nombre y el email del Usuario (y del Empleado) al vuelo, el session token de Clerk tiene que traer esos datos como custom claims. Configurarlo en el dashboard de Clerk, **Sessions → Customize session token**, agregando:

```json
{
  "name": "{{user.full_name}}",
  "email": "{{user.primary_email_address}}"
}
```

Sin esta configuración (o con un token viejo que no la tiene todavía), el back sigue funcionando igual: no refresca nada y no llama a la API de Clerk.

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
