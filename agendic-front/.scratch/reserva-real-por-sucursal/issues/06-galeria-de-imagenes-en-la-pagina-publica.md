# 06: Galería de imágenes en la página pública

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** `../../../../docs/adr/0015-imagenes-de-sucursal-en-storage-externo.md`

**Dónde trabajar:** `agendic-front/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`), reglas de esta app en `agendic-front/CLAUDE.md`.

**What to build:** la página real de Sucursal (ticket 05) muestra las imágenes reales de esa Sucursal en vez de los placeholders de `picsum.photos`.

**Blocked by:** 04 (back: `BranchImage`), 05 (página real de Sucursal).

**Contrato del back a consumir:**

- `GET /branches/:id/images` — sin Sesión. Devuelve el array de imágenes de esa Sucursal, ya ordenadas: `{ id, branchId, url, order }`. Array vacío si la Sucursal no tiene ninguna imagen todavía (caso válido, no es un error).

**Acceptance criteria:**

- [ ] La página de Sucursal pide este endpoint (mismo controlador/caso de uso de la página, sin fetch propio del componente) y renderiza las imágenes en el orden que vienen.
- [ ] Sucursal sin imágenes: la página no rompe ni muestra un placeholder falso — muestra el estado vacío que corresponda (por ejemplo, sin sección de galería).
- [ ] Se borra el uso de `picsum.photos` y el comentario `ponytail` sobre fotos placeholder en `BranchPublicPage.tsx`.
- [ ] Tests unitarios por capa (adaptador con `fetch` stubeado: 200 con imágenes, 200 con array vacío; caso de uso y controlador correspondientes).
