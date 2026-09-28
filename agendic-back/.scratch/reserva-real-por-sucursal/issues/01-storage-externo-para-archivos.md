# 01: Storage externo para archivos

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** `../../../../docs/adr/0015-imagenes-de-sucursal-en-storage-externo.md`

**Dónde trabajar:** `agendic-back/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`).

**What to build:** una forma genérica de subir un archivo y obtener de vuelta una URL pública y durable, respaldada por un storage de objetos externo (tipo S3), no por el disco del proceso del back (ADR 0015). No hace falta todavía ninguna relación con `Branch`: es la capacidad de base que el ticket 04 (imágenes de Sucursal) va a usar.

**Blocked by:** Ninguno (puede arrancar ya).

- [ ] Se elige un proveedor de storage S3-compatible (el que ya use el equipo para otra cosa, o el más simple de configurar si no hay ninguno elegido) y se documentan sus credenciales como variables de entorno, no hardcodeadas.
- [ ] Existe un módulo/servicio interno que recibe un archivo y devuelve la URL pública donde quedó guardado.
- [ ] Borrar por esa URL/clave también está soportado (lo va a necesitar el ticket 04 para borrar imágenes).
- [ ] Si el storage no está configurado (faltan credenciales/variables), el arranque del back falla con un mensaje claro, no un error de red silencioso en el primer uso.
- [ ] Test que sube y borra un archivo contra el storage real (o su emulador/sandbox), verificando que la URL devuelta sirve el contenido subido.
