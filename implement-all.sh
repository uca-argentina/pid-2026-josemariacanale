#!/usr/bin/env bash
REPO="uca-argentina/pid-2026-josemariacanale"

run_tests() {
  local labels="$1" ran=0
  if echo "$labels" | grep -qx "front"; then
    (cd agendic-front && npm test) || return 1
    ran=1
  fi
  if echo "$labels" | grep -qx "back"; then
    (cd agendic-back && npm test) || return 1
    ran=1
  fi
  if [ "$ran" -eq 0 ]; then
    echo "El issue no tiene label front ni back, no sé dónde correr los tests"
    return 1
  fi
}

for n in 12 13 14; do
  url="https://github.com/$REPO/issues/$n"
  labels=$(gh issue view "$url" --json labels --jq '.labels[].name')
  issue_text=$(gh issue view "$url" --json title,body --jq '"# " + .title + "\n\n" + .body')

  git checkout main && git pull
  git checkout -b "issue-$n"

    if claude -p "/implement Implementá este issue ($url):

$issue_text" --permission-mode acceptEdits \
       --allowedTools "Bash(git:*)" "Bash(npm:*)" \
       --output-format stream-json --verbose 2>&1 \
       | tee "logs/issue-$n.jsonl" \
       | jq -r --unbuffered 'select(.type=="assistant") | .message.content[] | if .type=="text" then "💬 " + .text elif .type=="tool_use" then "🔧 " + .name + " " + (.input|tostring|.[0:120]) else empty end' \
     && [ "$(git rev-list --count main..HEAD)" -gt 0 ] \
     && run_tests "$labels"; then
    git push -u origin "issue-$n"
    gh pr create --repo "$REPO" --head "issue-$n" --fill --body "Closes #$n"
    gh pr merge "issue-$n" --repo "$REPO" --squash --delete-branch
  else
    echo "Issue $n falló, lo dejo en su rama para revisar"
    git add -A && git commit -m "WIP: issue $n (falló)"
    git checkout main
  fi
done