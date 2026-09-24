# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone. Front and back share this one repo and this one tracker: label every issue with its area (see `triage-labels.md`).

## Tickets para dos ventanas (front / back)

Se trabaja con dos VS Code abiertos, uno en `agendic-front/` y otro en `agendic-back/`. El agente de cada ventana no tiene el código de la otra app, así que cada ticket tiene que alcanzarle por sí solo. Rige para todo ticket que escribas (`/to-tickets`, `/triage`, issues sueltos), ya sean archivos en `.scratch/` o issues de GitHub.

- **Un ticket, una app.** Nunca un ticket que toque front y back. El de front va bloqueado por el de back del que consume el contrato.
- **Dónde trabajar** (todos los tickets): la carpeta desde la que correr Claude (`agendic-front/` o `agendic-back/`), y dónde viven glosario, ADRs y tickets en la raíz (`../CONTEXT.md`, `../docs/adr/`, `../.scratch/<feature>/issues/`). En front, sumá las reglas de esa app (`agendic-front/CLAUDE.md`).
- **Contrato del back** (tickets de front que consumen la API): método, ruta, si exige Sesión, body, respuestas y códigos de error con su mensaje (por ejemplo el 409 de dirección en uso), en vocabulario del glosario. Remití al ticket del back y a `../docs/adr/0007-endpoints-de-la-api.md`. Nunca "mirá el código del back": si el contrato no alcanza, es un hueco del ticket del back, no algo para deducir del código.
- **Qué necesita el front** (tickets de back): una línea con cómo consume el front ese endpoint (por ejemplo "el front muestra el 409 bajo el campo") cuando eso condiciona el contrato. No hace falta describir componentes ni nada del front.
- **Rutas de archivo**: van las de docs, ADRs y tickets, y el contrato de la API. No van rutas al código de la implementación (se desactualizan rápido).

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
