#!/bin/sh
echo "=== 1. Enviar syslog de prueba ==="
logger -n wazuh-manager -P 514 -t n8n-test "Syslog test from n8n at $(date)"
echo "Sent. Waiting 3 seconds..."
sleep 3
echo ""
echo "=== 2. Verificar en archives ==="
docker compose exec wazuh-manager sh -c "grep 'n8n-test' /var/ossec/logs/archives/2026/Jun/ossec-archive-23.log 2>/dev/null | tail -3"
echo ""
echo "=== 3. Verificar en alerts ==="
docker compose exec wazuh-manager sh -c "grep 'n8n-test' /var/ossec/logs/alerts/2026/Jun/ossec-alerts-23.json 2>/dev/null | tail -3"
echo ""
echo "=== 4. Verificar en alerts.json ==="
docker compose exec wazuh-manager sh -c "grep 'n8n-test' /var/ossec/logs/alerts/alerts.json 2>/dev/null | tail -3"
