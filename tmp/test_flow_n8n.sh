#!/bin/sh
echo "=== 1. Wazuh Auth ==="
time curl -s -u wazuh-wui:MyS3cr37P450r -X POST 'http://wazuh-manager:55000/security/user/authenticate' -o /tmp/auth.json -w 'Auth: HTTP %{http_code} - %{time_total}s'
echo ""
TOKEN=$(python3 -c 'import sys,json;print(json.load(open("/tmp/auth.json"))["data"]["token"])' 2>/dev/null)
echo "Token: ${TOKEN:0:30}..."
echo ""
echo "=== 2. Wazuh Events ==="
time curl -s -X POST 'http://wazuh-manager:55000/events' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"events":[{"timestamp":"2026-06-23T18:00:00Z","rule":{"id":100001,"level":8,"description":"test from n8n"},"agent":{"id":"003","name":"n8n"},"data":{"srcip":"192.168.1.100"},"location":"n8n"}]}' -o /dev/null -w 'Events: HTTP %{http_code} - %{time_total}s'
echo ""
echo "=== 3. Logstash ==="
time curl -s -X POST 'http://logstash:8080' -H 'Content-Type: application/json' -d '{"data_source":"n8n_test","rule_name":"test","severity":"high","source_ip":"192.168.1.100","risk_score":50,"description":"test","raw_log":"test log","timestamp":"2026-06-23T18:00:00Z"}' -o /dev/null -w 'Logstash: HTTP %{http_code} - %{time_total}s'
echo ""
echo "=== Done ==="
