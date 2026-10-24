#!/usr/bin/env bash
# End-to-end check of the free path: health, signup, hint, two answers, quick
# feedback. Run against a local server with the agent in stub mode; never
# against production (it creates a user).
set -euo pipefail
BASE="${1:-http://localhost:3000}"
J='content-type: application/json'
field() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],JSON.parse(s));if(v===undefined){console.error("missing "+process.argv[1]+" in "+s);process.exit(1)}console.log(v)})' "$1"; }

curl -sf --retry 30 --retry-connrefused --retry-delay 1 "$BASE/api/health" > /dev/null
curl -sf -o /dev/null "$BASE/"

SID=$(curl -sf -X POST "$BASE/api/signup" -H "$J" \
  -d '{"name":"CI Smoke","phone":"9000000099","role":"software-engineer","consent":true,"isEventStaff":true,"src":"ci"}' | field sessionId)

for n in 1 2; do
  Q=$(curl -sf "$BASE/api/sessions/$SID" | field current.id)
  curl -sf -X POST "$BASE/api/sessions/$SID/hint" -H "$J" -d "{\"questionId\":\"$Q\"}" | field hint > /dev/null
  curl -sf -X POST "$BASE/api/sessions/$SID/answers" -H "$J" \
    -d "{\"questionId\":\"$Q\",\"mode\":\"text\",\"transcript\":\"Smoke test answer number $n with enough words to count.\"}" > /dev/null
done

curl -sf -X POST "$BASE/api/sessions/$SID/quick-eval" | field quickFeedback.overall_estimate > /dev/null
NEXT=$(curl -sf "$BASE/api/sessions/$SID" | field next)
[ "$NEXT" = "upsell" ] || { echo "expected next=upsell, got $NEXT"; exit 1; }
echo "smoke test passed (session $SID)"
