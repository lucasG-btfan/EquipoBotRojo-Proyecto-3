# ============================================
# Script de arranque - EquipoBotRojo SIEM/SOAR
# ============================================

# Para ejecutar: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\iniciar-proyecto.ps1

Write-Host "Iniciando stack Docker..." -ForegroundColor Cyan
docker compose up -d

Write-Host "Esperando que los contenedores inicialicen (45 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# --------------------------------------------
# DAEMONS DE WAZUH MANAGER
# Si el agente Wazuh de tu maquina aparece como "Never connected" o "Unknown"
# en el dashboard, asegurate de que estos comandos se ejecutaron correctamente.
# --------------------------------------------

Write-Host "Iniciando daemons de Wazuh Manager..." -ForegroundColor Cyan
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-db &"
Start-Sleep -Seconds 5

docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-remoted & /var/ossec/bin/wazuh-analysisd & /var/ossec/bin/wazuh-execd & /var/ossec/bin/wazuh-logcollector & /var/ossec/bin/wazuh-syscheckd & /var/ossec/bin/wazuh-modulesd &"
Start-Sleep -Seconds 3

# wazuh-authd: maneja el registro (enrollment) de agentes en el puerto 1515.
# Necesario para que nuevos agentes puedan registrarse o re-registrarse.
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-authd &"
Start-Sleep -Seconds 3

# wazuh-apid: expone la API REST de Wazuh en el puerto 55000.
# Necesario para que el dashboard de Wazuh pueda conectarse al manager.
docker exec wazuh-manager sh -c "nohup /var/ossec/bin/wazuh-apid > /dev/null 2>&1 &"
Start-Sleep -Seconds 5

# Se reinicia wazuh-db luego de que los daemons levantaron para que inicialice
# correctamente las bases de datos internas de cada agente registrado.
# Sin este paso, los agentes pueden quedar en estado "Unknown" aunque esten conectados.
Write-Host "Reiniciando wazuh-db para inicializar BDs de agentes..." -ForegroundColor Yellow
docker exec wazuh-manager sh -c "pkill wazuh-db; sleep 3; /var/ossec/bin/wazuh-db &"
Start-Sleep -Seconds 10

Write-Host "Verificando estado de agentes..." -ForegroundColor Cyan
docker exec wazuh-manager sh -c "/var/ossec/bin/agent_control -l"

# --------------------------------------------
# NOTA: Si tu agente Windows figura como "Unknown" o "Never connected"
# despues de ejecutar este script, puede deberse a que la clave del agente
# en C:\Program Files (x86)\ossec-agent\client.keys no coincide con la del manager.
# En ese caso, verificar el archivo ./wazuh/manager/etc/client.keys
# y asegurarse de que ambos tienen la misma clave para el mismo ID de agente.
# El agente debe conectarse al puerto 1515 del host (mapeado al 1514 del contenedor).
# --------------------------------------------