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
  --title "Reserva real por Sucursal: el Enlace de reserva llega hasta el Turno confirmado" \
  --body-file ".scratch/reserva-real-por-sucursal/spec.md" \
  --label "full-stack" | issue_num)
echo "Spec: #$SPEC"

B01=$(gh issue create \
  --title "01: Storage externo para archivos" \
  --body-file "agendic-back/.scratch/reserva-real-por-sucursal/issues/01-storage-externo-para-archivos.md" \
  --label "back,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$B01"
echo "01 storage: #$B01"

B02=$(gh issue create \
  --title "02: Enlace de reserva con tramo de Sucursal" \
  --body-file "agendic-back/.scratch/reserva-real-por-sucursal/issues/02-enlace-de-reserva-con-tramo-de-sucursal.md" \
  --label "back,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$B02"
echo "02 branch-slug: #$B02"

B03=$(gh issue create \
  --title "03: Seña y Comentario del Turno" \
  --body-file "agendic-back/.scratch/reserva-real-por-sucursal/issues/03-sena-y-comentario-del-turno.md" \
  --label "back,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$B03"
echo "03 sena-notes: #$B03"

B04=$(gh issue create \
  --title "04: Imágenes de Sucursal" \
  --body-file "agendic-back/.scratch/reserva-real-por-sucursal/issues/04-imagenes-de-sucursal.md" \
  --label "back,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$B04"
link_blocker "$B04" "$B01"
echo "04 branch-images: #$B04 (blocked by #$B01)"

F05=$(gh issue create \
  --title "05: Página real de Sucursal" \
  --body-file "agendic-front/.scratch/reserva-real-por-sucursal/issues/05-pagina-real-de-sucursal.md" \
  --label "front,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$F05"
link_blocker "$F05" "$B02"
link_blocker "$F05" "$B03"
echo "05 pagina-real: #$F05 (blocked by #$B02, #$B03)"

F06=$(gh issue create \
  --title "06: Galería de imágenes en la página pública" \
  --body-file "agendic-front/.scratch/reserva-real-por-sucursal/issues/06-galeria-de-imagenes-en-la-pagina-publica.md" \
  --label "front,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$F06"
link_blocker "$F06" "$B04"
link_blocker "$F06" "$F05"
echo "06 galeria: #$F06 (blocked by #$B04, #$F05)"

F07=$(gh issue create \
  --title "07: Reserva real de Turno" \
  --body-file "agendic-front/.scratch/reserva-real-por-sucursal/issues/07-reserva-real-de-turno.md" \
  --label "front,ready-for-agent" | issue_num)
link_subissue "$SPEC" "$F07"
link_blocker "$F07" "$B03"
link_blocker "$F07" "$F05"
echo "07 reserva-real: #$F07 (blocked by #$B03, #$F05)"

echo "Listo. Spec #$SPEC con tickets #$B01 #$B02 #$B03 #$B04 #$F05 #$F06 #$F07"
