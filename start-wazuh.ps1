Write-Host "Arrancando daemons de Wazuh..." -ForegroundColor Cyan

# 1. Daemons principales
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-db &"
Start-Sleep -Seconds 3
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-remoted &"
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-analysisd &"
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-execd &"
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-logcollector &"
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-syscheckd &"
docker exec wazuh-manager sh -c "/var/ossec/bin/wazuh-modulesd &"
Start-Sleep -Seconds 5

# 2. authd con SSL
docker exec wazuh-manager sh -c "openssl req -x509 -batch -nodes -days 365 -newkey rsa:4096 -keyout /var/ossec/etc/sslmanager.key -out /var/ossec/etc/sslmanager.cert 2>/dev/null"
docker exec wazuh-manager sh -c "nohup /var/ossec/bin/wazuh-authd -x /var/ossec/etc/sslmanager.cert -k /var/ossec/etc/sslmanager.key > /dev/null 2>&1 &"

# 3. API
docker exec wazuh-manager sh -c "nohup /var/ossec/bin/wazuh-apid > /dev/null 2>&1 &"
Start-Sleep -Seconds 5

Write-Host "Wazuh listo!" -ForegroundColor Green