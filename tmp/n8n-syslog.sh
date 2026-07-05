#!/bin/sh
# n8n-syslog - Envía mensaje syslog BSD UDP a wazuh-manager
# Uso: n8n-syslog <rule_name> <severity> <source_ip> <description> <risk_score>
RULE_NAME="${1:-unknown}"
SEVERITY="${2:-info}"
SOURCE_IP="${3:-0.0.0.0}"
DESCRIPTION="${4:-No description}"
RISK_SCORE="${5:-0}"

TIMESTAMP=$(date "+%b %d %H:%M:%S")
MSG="rule_name=$RULE_NAME severity=$SEVERITY srcip=$SOURCE_IP description=$DESCRIPTION risk_score=$RISK_SCORE event_source=n8n_workflow"

printf "<14>%s wazuh-manager wazuh_monitor: %s\n" "$TIMESTAMP" "$MSG" | timeout 2 nc -u wazuh-manager 514 2>/dev/null || true
