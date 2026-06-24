#!/bin/sh
echo "=== Step 1: Auth ==="
time curl -s -u wazuh-wui:MyS3cr37P450r -X POST 'http://localhost:55000/security/user/authenticate' > /tmp/auth_response.json 2>&1
TOKEN=$(python3 -c 'import sys,json;print(json.load(open("/tmp/auth_response.json"))["data"]["token"])' 2>/dev/null)
echo "Auth token: ${TOKEN:0:30}..."
echo ""
echo "=== Step 2: Send event ==="
time curl -s -X POST 'http://localhost:55000/events' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"events":[{"timestamp":"2026-06-23T18:00:00Z","rule":{"id":100001,"level":5,"description":"test"},"agent":{"id":"003","name":"test"},"data":{"srcip":"192.168.1.100"},"location":"test"}]}' \
  -o /dev/null \
  -w 'Events: HTTP %{http_code} - %{time_total}s\n'
echo ""
echo "=== Step 3: Send to Logstash ==="
time curl -s -X POST 'http://logstash:8080' \
  -H 'Content-Type: application/json' \
  -d '{"data_source":"test","rule_name":"test","severity":"high","source_ip":"192.168.1.100","risk_score":50,"description":"test","raw_log":"test","timestamp":"2026-06-23T18:00:00Z"}' \
  -o /dev/null \
  -w 'Logstash: HTTP %{http_code} - %{time_total}s\n'
echo ""
echo "=== Done ==="
