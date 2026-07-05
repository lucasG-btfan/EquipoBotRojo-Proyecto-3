#!/bin/sh
echo 'Sending syslog JSON...'
echo '{"timestamp":"2026-06-23T21:55:00Z","rule":{"id":100001,"level":8,"description":"SYSLOG JSON TEST","mitre":{"tactic":"Credential Access","technique":"Brute Force"}},"agent":{"id":"003","name":"n8n-workflow"},"data":{"srcip":"10.10.10.99","rule_name":"TestRule","risk_score":70,"risk_level":"HIGH"},"location":"n8n_workflow","full_log":"Test syslog JSON alert from n8n"}' | nc -w 2 -u wazuh-manager 514
echo 'Sent!'
