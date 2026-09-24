# 07: Página pública del Negocio en el front

**What to build:** Un Cliente que abre el Enlace de reserva de un Negocio (`/business/<slug>`), con o sin Sesión, ve de qué Negocio se trata, sus Sucursales con su horario de apertura y cierre, y los Servicios activos de cada una con su duración y su precio. Una dirección que no existe muestra un 404 claro.

**Blocked by:** 04 (Búsqueda pública de Negocio por Enlace de reserva (back))

**Status:** ready-for-agent

- [ ] Ruta dinámica `app/business/[slug]/`, fuera del grupo del panel y fuera del que exige Sesión
- [ ] Server component que obtiene el controlador por inyección, le pasa el slug crudo, y pinta el Negocio con sus Sucursales y sus Servicios; no llama al back por su cuenta
- [ ] Módulo core nuevo: repositorio (buscar Negocio por Enlace de reserva y traer sus Sucursales con sus Servicios), caso de uso, controlador y presenter, registrados en el contenedor
- [ ] No autentica: el controlador no exige Sesión, porque el endpoint es público
- [ ] No se muestran los Servicios dados de baja
- [ ] Negocio inexistente → 404 con el mecanismo del framework; cualquier otro fallo se reporta por el crash reporter y muestra un mensaje genérico
- [ ] Tests unitarios por capa con los puertos stubeados (prior art: tests del controlador de Usuario actual y stubs compartidos):
  - Controlador: camino feliz (el presenter deja solo lo que la página muestra); Negocio inexistente (propaga el error de no encontrado); slug con formato inválido (no llama al caso de uso)
  - Caso de uso: Negocio con Sucursales y Servicios; Negocio sin Sucursales; Negocio inexistente
  - Adaptador: `fetch` stubeado — 200 devuelve lo parseado; 404 tira el error de no encontrado; 500 y JSON inválido tiran el error de persistencia con `cause`; `API_URL` ausente tira error
  - Contenedor: el test existente resuelve también el controlador nuevo
- [ ] La página y el layout no llevan test unitario: son capa de framework
