#!/bin/sh
# Send a properly formatted syslog alert to Wazuh
ALERT='{"timestamp":"2026-06-23T22:05:00Z","rule":{"id":100001,"level":12,"description":"CRITICAL SSH Brute Force from n8n"},"agent":{"id":"003","name":"n8n-workflow"},"data":{"srcip":"10.10.10.99","rule_name":"SSH_Brute_Force","risk_score":95,"risk_level":"CRITICAL"},"location":"n8n_workflow","full_log":"SSH brute force detected from 10.10.10.99 by n8n workflow"}'
echo "Sending: $ALERT"
echo "---"
echo "$ALERT" | nc -w 2 -u wazuh-manager 514
echo "Sent!"
