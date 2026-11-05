# Coding standards

Las reglas contra las que se revisa una diff. Las aplica el review (`/code-review`), no la implementación: quien implementa hace que funcione, el review lo deja bien.

Aplicá cada archivo a los cambios dentro de su alcance. Algunos también los lee la implementación (`errors.md` siempre, la parte de `data-layer.md` que dice cómo migrar); el review igual los chequea completos. La clean architecture (front y back) se verifica **solo** en el review: la implementación no la lee ni la cita.

| Archivo | Alcance | Qué cubre |
|---|---|---|
| `docs/agents/comments.md` | `.ts` / `.tsx` de front y back | TSDoc en símbolos exportados, `//` solo para un *por qué*, `@throws` siempre |
| `docs/agents/errors.md` | front y back | Clases de error de dominio, mensajes con el valor que falló, `{ cause }` al envolver vendors, mensajes del back como contrato (ADR 0007) |
| `agendic-back/docs/agents/data-layer.md` | repositorios Prisma y `prisma/` | `select` sobre `include`, nombres de métodos de repositorio, solo acceso a datos, migraciones |
| `agendic-back/docs/agents/performance.md` | back | Loops cuadráticos, costo del cálculo de Horarios reservables |
| `agendic-front/docs/agents/clean-architecture.md` | `app/`, `src/`, `di/`, `tests/` del front | Capas, mapa de imports, nombres, formas de use cases y controllers |
| `docs/adr/0001-clean-architecture-sobre-di-de-nestjs.md` y `agendic-back/.oxlintrc.json` | `src/` del back | Capeado domain ← application ← infrastructure, puertos en `domain/interfaces`, un caso de uso por operación, presenters, errores de dominio traducidos por el exception filter; el ADR fija dónde el back se aparta a propósito del front |
| `agendic-front/docs/agents/ui-components.md` | componentes React del front | Dónde va cada componente, server vs. client, composición |
