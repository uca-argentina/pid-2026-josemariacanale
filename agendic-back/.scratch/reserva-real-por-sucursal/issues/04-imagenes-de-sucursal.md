# 04: Imágenes de Sucursal

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** `../../../../docs/adr/0015-imagenes-de-sucursal-en-storage-externo.md`, actualizar `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-back/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`).

**What to build:** el Dueño sube, borra y ordena las imágenes de su Sucursal; cualquiera (con o sin Sesión) las lista en orden, ya que son públicas.

**Blocked by:** 01 (storage externo para archivos).

- [ ] `BranchImage` nuevo: `id`, `branchId`, `url`, `order`. Se borra en cascada si se borra la Sucursal.
- [ ] `POST /branches/:id/images` (requiere Sesión): sube una imagen usando el storage del ticket 01, crea el `BranchImage` con el `order` siguiente al último de esa Sucursal. Solo el Dueño de ese Negocio puede hacerlo; cualquier otro Usuario → 403.
- [ ] `DELETE /branches/:id/images/:imageId` (requiere Sesión): borra el archivo del storage y la fila. Solo el Dueño; otro Usuario → 403. Imagen que no es de esa Sucursal → 404.
- [ ] `PUT /branches/:id/images/order` (requiere Sesión): recibe la lista completa de `imageId` en el orden deseado y reemplaza el `order` de todas (mismo patrón que `PUT /employees/:id/overrides/:date`). Solo el Dueño; lista que no incluye exactamente las imágenes actuales de esa Sucursal → 400 o 422 (a definir con el mismo criterio que otros DTOs de reemplazo total).
- [ ] `GET /branches/:id/images` (sin Sesión): lista las imágenes de esa Sucursal ordenadas por `order`.
- [ ] `docs/adr/0007-endpoints-de-la-api.md` queda actualizado con los cuatro endpoints, sus DTOs y su respuesta.
- [ ] Tests HTTP: subir/borrar/reordenar por alguien que no es el Dueño → 403; borrar/reordenar una imagen que no es de esa Sucursal → 404; listar sin Sesión → 200 en el orden correcto; subir agrega al final; reordenar cambia el orden devuelto por el GET.

**Qué necesita el front:** el ticket 06 (galería en la página pública) solo necesita `GET /branches/:id/images`, pública. Los otros tres endpoints (`POST`/`DELETE`/`PUT .../order`) son para el panel de administración del Dueño, que no forma parte de esta spec — quedan disponibles para cuando exista esa pantalla.
