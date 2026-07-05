#!/bin/sh
# Test 1: JSON alert as syslog
echo '=== Enviando alerta JSON por syslog ==='
ALERT='{"timestamp":"2026-06-23T21:50:00Z","rule":{"id":100001,"level":8,"description":"Test syslog JSON from n8n","mitre":{"tactic":"Credential Access","technique":"Brute Force"}},"agent":{"id":"003","name":"n8n-workflow"},"data":{"srcip":"192.168.50.100","rule_name":"SSH Brute Force","risk_score":70,"risk_level":"HIGH"},"location":"n8n_workflow"}'
echo "$ALERT" | nc -w 2 -u wazuh-manager 514
echo "Sent. Waiting 5s..."
sleep 5
echo ''
echo '=== Checking in alerts ==='
grep '192.168.50.100' /var/ossec/logs/alerts/2026/Jun/ossec-alerts-23.json 2>/dev/null && echo "FOUND IN ALERTS!" || echo "Not in alerts"
echo ''
echo '=== Checking in archives ==='
grep '192.168.50.100' /var/ossec/logs/archives/2026/Jun/ossec-archive-23.log 2>/dev/null | tail -3
