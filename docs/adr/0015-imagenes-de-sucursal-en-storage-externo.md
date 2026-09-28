# Imágenes de Sucursal en storage externo, no en disco del back

La Sucursal necesita guardar varias imágenes que el Dueño sube y que el Enlace de reserva muestra. Descartamos guardarlas en el disco del proceso del back: la mayoría de los hosts de despliegue no tienen disco persistente entre releases, así que una imagen subida hoy puede desaparecer en el próximo deploy. Se van a guardar en un storage de objetos externo (tipo S3), accedido por URL desde `BranchImage`.

## Consecuencias

- El back habla la API de S3, no la de un proveedor en particular: el proveedor concreto (sugerido Cloudflare R2) y sus credenciales se eligen con las variables `S3_*` documentadas en `agendic-back/README.md`, sin tocar código. Sin ellas el back no arranca.
- El back gana una dependencia de red nueva (el storage externo) en el camino de subir una imagen; no la tiene hoy para nada más.
