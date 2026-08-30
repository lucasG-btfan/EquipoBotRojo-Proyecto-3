# ============================================
# Script de arranque - EquipoBotRojo SIEM/SOAR
# ============================================

# Para ejecutar: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\iniciar-proyecto.ps1

Write-Host "Iniciando stack Docker..." -ForegroundColor Cyan
docker compose up -d

Write-Host "Esperando que los contenedores inicialicen (45 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

Write-Host "Iniciando daemons de Wazuh Manager..." -ForegroundColor Cyan
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-db &"
Start-Sleep -Seconds 5

docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-remoted & /var/ossec/bin/wazuh-analysisd & /var/ossec/bin/wazuh-execd & /var/ossec/bin/wazuh-logcollector & /var/ossec/bin/wazuh-syscheckd & /var/ossec/bin/wazuh-modulesd &"
Start-Sleep -Seconds 3

docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-authd &"
Start-Sleep -Seconds 3

docker exec wazuh-manager sh -c "nohup /var/ossec/bin/wazuh-apid > /dev/null 2>&1 &"
Start-Sleep -Seconds 5

Write-Host "Reiniciando wazuh-db para inicializar BDs de agentes..." -ForegroundColor Yellow
docker exec wazuh-manager sh -c "pkill wazuh-db; sleep 3; /var/ossec/bin/wazuh-db &"
Start-Sleep -Seconds 10

Write-Host "Verificando estado de agentes..." -ForegroundColor Cyan
docker exec wazuh-manager sh -c "/var/ossec/bin/agent_control -l"

