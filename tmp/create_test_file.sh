#!/bin/sh
# Create a proper JSON test file in /host_logs/
cat > /host_logs/n8n_test.json << 'JSONEOF'
{"timestamp":"2026-06-23T22:15:00Z","srcip":"10.10.10.99","rule_name":"TestFileAlert","risk_level":"CRITICAL","location":"n8n_file_test","description":"Test file alert from n8n"}
JSONEOF
echo "Created /host_logs/n8n_test.json"
cat /host_logs/n8n_test.json
echo ""
echo "Files in /host_logs/:"
ls -la /host_logs/ | grep n8n
