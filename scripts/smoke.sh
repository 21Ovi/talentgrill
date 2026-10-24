#!/usr/bin/env bash
# End-to-end check: health, signup, hint, two answers, quick feedback, course, payment
# and webhook rejection. Run against a local server with the agent in stub mode; never
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
curl -sf -X POST "$BASE/api/sessions/$SID/course" | field course.lessons.2.drill > /dev/null
NEXT=$(curl -sf "$BASE/api/sessions/$SID" | field next)
[ "$NEXT" = "upsell" ] || { echo "expected next=upsell, got $NEXT"; exit 1; }

# Pay (Pine Labs in stub mode: the checkout "succeeds" immediately).
PID=$(curl -sf -X POST "$BASE/api/payments/create" -H "$J" -d "{\"sessionId\":\"$SID\"}" | field paymentId)
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/payments/return?pid=$PID")
[ "$CODE" = "303" ] || { echo "expected payment return to redirect (303), got $CODE"; exit 1; }
STATUS=$(curl -sf "$BASE/api/payments/verify?pid=$PID" | field status)
[ "$STATUS" = "SUCCESS" ] || { echo "expected payment SUCCESS, got $STATUS"; exit 1; }
PRO=$(curl -sf "$BASE/api/sessions/$SID" | field session.isPro)
[ "$PRO" = "true" ] || { echo "expected session to be Pro after payment"; exit 1; }

# Webhooks without a valid signature are rejected.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/webhooks/pinelabs" -H "$J" -d '{"event_type":"ORDER_PROCESSED"}')
[ "$CODE" = "401" ] || { echo "expected unsigned webhook to get 401, got $CODE"; exit 1; }
echo "smoke test passed (session $SID)"
