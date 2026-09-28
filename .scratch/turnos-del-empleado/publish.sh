#!/usr/bin/env bash
# Correr desde la raiz del repo, en una maquina con gh autenticado (gh auth login).
set -euo pipefail

REPO="uca-argentina/pid-2026-josemariacanale"

issue_num() { grep -oE '[0-9]+$'; }
db_id() { gh api "repos/$REPO/issues/$1" --jq .id; }
link_blocker() { gh api --method POST "repos/$REPO/issues/$1/dependencies/blocked_by" -f "issue_id=$(db_id "$2")"; }
link_subissue() {
  gh api --method POST "repos/$REPO/issues/$1/sub_issues" -F "sub_issue_id=$(db_id "$2")" || \
    echo "sub-issues no habilitado en el repo; agrega 'Part of #$1' al body de #$2 a mano"
}

SPEC=$(gh issue create \
  --title "Turnos del Empleado: \"mis turnos\" deja de ser mock" \
  --body-file ".scratch/turnos-del-empleado/spec.md" \
  --label "full-stack" | issue_num)
echo "Spec: #$SPEC"

B01=$(gh issue create \
  --title "01: Aprobación manual y Turno pendiente" \
  --body-file "agendic-back/.scratch/turnos-del-empleado/issues/01-aprobacion-manual-y-turno-pendiente.md" \
  --label "back,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$B01"
echo "01 aprobacion-manual: #$B01"

B02=$(gh issue create \
  --title "02: Mis turnos del Empleado (listado, Cancelar, Reagendar, Ausencia)" \
  --body-file "agendic-back/.scratch/turnos-del-empleado/issues/02-mis-turnos-del-empleado.md" \
  --label "back,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$B02"
echo "02 mis-turnos: #$B02"

F03=$(gh issue create \
  --title "03: Conectar lista y detalle de \"mis turnos\" a datos reales" \
  --body-file "agendic-front/.scratch/turnos-del-empleado/issues/03-conectar-lista-y-detalle.md" \
  --label "front,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$F03"
link_blocker "$F03" "$B02"
echo "03 lista-y-detalle: #$F03 (blocked by #$B02)"

F04=$(gh issue create \
  --title "04: Conectar Aceptar/Rechazar/Cancelar/Reagendar/Ausencia" \
  --body-file "agendic-front/.scratch/turnos-del-empleado/issues/04-conectar-acciones.md" \
  --label "front,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$F04"
link_blocker "$F04" "$B01"
link_blocker "$F04" "$B02"
link_blocker "$F04" "$F03"
echo "04 conectar-acciones: #$F04 (blocked by #$B01, #$B02, #$F03)"

echo "Listo. Spec #$SPEC con tickets #$B01 #$B02 #$F03 #$F04"
