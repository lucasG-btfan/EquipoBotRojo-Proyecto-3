# EJERCICIO 1:

## Comandos para creacion de clientes y visualización de logs

## Creacion de clientes (asociados a la red equipobotrojoproyecto3_default )
docker run --rm -it --network equipobotrojoproyecto3_default --name client1 alpine sh

docker run --rm -it --network equipobotrojoproyecto3_default --name client2 alpine sh

docker run --rm -it --network equipobotrojoproyecto3_default --name client3 alpine sh

## Creacion de logs en cada cliente 

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec client1 sh -c "echo '<4>Failed password for invalid user admin from 192.168.1.10 port 55874 ssh2' | nc -u -w1 syslog-ng 1514"

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec client2 sh -c "echo '<3>sshd[123]: Started OpenSSH Daemon successfully' | nc -u -w1 syslog-ng 1514"

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec client3 sh -c "echo '<4>kernel: [UFW BLOCK] IN=eth0 OUT= MAC= SRC=10.0.0.2 DST=10.0.0.3 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=12345 DF PROTO=TCP SPT=443 DPT=22 WINDOW=29200 RES=0x00 SYN URGP=0' | nc -u -w1 syslog-ng 1514"

## Visualizacion centralizada de logs

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec -it syslog-ng cat /var/log/centralized/all.log

### Aclaracion
El contenido de esta version esta diseñado para cumplir con las consignas del ejercicio 1 y 2 del github: 
Ejercicio 1:
- Syslog-ng configurado como servidor central
- Tres clientes simulados enviando logs
- Verificacion de recepcion centralizada
Ejercicio 2:
- Crear 5 reglas personalizadas de deteccion
- Workflow de n8n
- Alerta de prueba

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec -it syslog-ng cat /var/log/security/alerts.log
cat: /var/log/security/alerts.log: No such file or directory

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec -it syslog-ng cat /var/log/security/failed_ssh.log

Estos comandos no funcionan todavia debido a una configuracion presente en syslog: 

filter f_ssh_failed {
    facility(auth, authpriv) and
    match("Failed password" value("MESSAGE"));
};

Esta parte: facility(auth, authpriv); dificulta la creacion de logs manuales, pero el sistema funciona correctamente.

# EJERCICIO 2:

El paso de instalacion de Elasticsearch (paso 3) se realiza mediante Docker Compose en lugar de instalacion directa sobre el sistema operativo, cumpliendo la misma funcionalidad de forma portable y reproducible.

Para el paso 4, se usa el comando Invoke-WebRequest -UseBasicParsing http://localhost:9200/_cat/indices?v para comprobar que la conexion entre elasticsearch y logstash funcione.

Para el paso 5, se creo una carpeta llamada db donde esta el archivo schema.sql, donde esta la creacion de tablas e indices (la creacion de la base de datos esta comentada porque Docker ya se encarga de eso, por lo que daria error) 

## Flujos de n8n
Descripcion de cada nodo:
1. Schedule Trigger: "Despierta" cada 5 minutos para iniciar el análisis
2. Simulate Logs: Fabrica eventos de seguridad como si vinieran de syslog
3. Parse Logs: Extrae IPs, usuarios, tipos de ataque de texto crudo
4. Apply Rules: Pregunta a PostgreSQL: "¿Estos eventos violan alguna regla?"
5. Check Severity: Decide: ¿Es alerta real (high/medium) o solo info?
6. Store Alerts (rama YES): Guarda en DB para historial e investigación
7. Send Notifications: Prepara avisos (en consola, listos para email/Slack)
8. Log Only (rama NO): Registra que no pasó nada importante
9. Update Patterns: Cierra el ciclo, actualiza estadísticas

# Sistema de Monitoreo de Seguridad - Resultados

### Resultados de la Prueba 

SELECT
    '✅ WORKFLOW FUNCIONAL' as estado,
    COUNT(*) as total_alertas,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as alertas_high,
    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as alertas_medium,
    COUNT(CASE WHEN severity = 'low' THEN 1 END) as alertas_low,
    MAX(timestamp) as ultima_alerta,
    'PostgreSQL + n8n + syslog-ng' as componentes
FROM alerts;

Resultado:

WORKFLOW FUNCIONAL | 4 alertas total | 2 HIGH | 1 MEDIUM | 1 LOW

Arquitectura Implementada:

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  syslog-ng  │───▶│    n8n      │───▶│ PostgreSQL  │───▶│ Elasticsearch│
│  (Puerto 514)│    │(Workflows)  │    │   (BD)      │    │  (Opcional)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                  │                   │                  │
        ▼                  ▼                   ▼                  ▼
   Logs del sistema   Procesamiento       Almacenamiento      Búsqueda/Análisis

Consulta a postgre para ver las alertas generadas:

SELECT id, severity, rule_id, source_ip, status, LEFT(description, 50) 
FROM alerts ORDER BY id DESC LIMIT 10;

### Ver alertas en PostgreSQL
docker exec security-postgres psql -U db_user -d security_monitoring -c "SELECT * FROM alerts;"

### Ver reglas de detección
docker exec security-postgres psql -U db_user -d security_monitoring -c "SELECT * FROM detection_rules;"

Con este paso hemos logrado:
 - Comunicación entre contenedores
 - Workflow n8n ejecutándose automáticamente
 - Alertas clasificadas por severidad (High/Medium/Low)
 - Datos persistentes en PostgreSQL
 - Reglas de detección personalizadas configuradas
 - Notificaciones preparadas (email/Slack)


# EJERCICIO 3

Para cumplir la consigna 1 hay que tener varias consideraciones en cuenta:
Primero, en N8N se modificó levemente el nodo 4, el encargado de pasar los datos procesados correctamente para su posterior envío. Además, se creó un nodo HTTP Request (Post) para enviar los datos a Logstash (http://logstash:8080).
Por otro lado, se deben enviar los datos desde Logstash hacia ElasticSearch, para su posterior visualizacion (Grafana/Kibana). Presentamos algunos problemas puntuales:
- A diferencia de una empresa, al estar trabajando desde una sola computadora, tuvimos que colocar un comando para que ElasticSearch no generara replicas. Esto ocurre debido a que  busca crear copias de los datos enviados en otro lugar, pero al tener una sola computadora, no es posible. 

Solucion: $template = '{"index_patterns": ["security-logs-*"], "template": {"settings": {"number_of_replicas": 0}}}'; Invoke-RestMethod -Method Put -Uri "http://localhost:9200/_index_template/logs_template" -ContentType "application/json" -Body $template

- Al tener poco espacio de almacenamiento, ElasticSearch bloquea la entrada y niega el traspaso de datos.

Solucion: $settings = '{"transient": {"cluster.routing.allocation.disk.threshold_enabled": false}}'; Invoke-RestMethod -Method Put -Uri "http://localhost:9200/_cluster/settings" -ContentType "application/json" -Body $settings
Estas 2 causas hacian que al hacer el get a localhost 9200, el sistema de el estado "red", que quiere decir que no es funcional. Al solucionar estos problemas, el estado paso a "green".

Como se llevan los datos a elastic: Activamos el workflow de N8N. Para ver si resulto, escribimos este comando en la terminal: Invoke-RestMethod -Method Get -Uri "http://localhost:9200/_cat/indices?v". Este comando invoca un metodo especial, le decimos que es de tipo get, y especificamos la URL a la cual queremos consultar.

# Security Monitoring System - ELK + n8n

## Sistema de Monitoreo de Seguridad

### Componentes
- **Elasticsearch**: Almacenamiento y búsqueda (puerto 9200)
- **Kibana**: Visualización y dashboards (puerto 5601)
- **Logstash**: Procesamiento de logs (puertos 8080, 8081)
- **n8n**: Automatización y generación de alertas (puerto 5678)
- **PostgreSQL**: Base de datos para n8n (puerto 5432)

### Flujo de Datos
1. n8n workflow genera alertas de seguridad
2. HTTP POST → Logstash:8081 (endpoint: /n8n-alerts)
3. Logstash procesa y envía a Elasticsearch
4. Índice: `n8n-alerts-YYYY.MM.dd`
5. Data View en Kibana: `n8n-alerts`
6. Dashboard de monitoreo

### Estructura de Alertas
{
  "timestamp": "2024-01-19T12:30:00Z",
  "source_ip": "192.168.1.100",
  "severity": "high",
  "rule_name": "Failed Login Attempts",
  "source": "n8n",
  "threat_score": 75,
  "message": "Multiple failed login attempts detected"
}

# EJERCICIO 4: Respuesta Automática y Notificaciones Multi-canal

Descripción:El ejercicio 4 implementa un sistema completo de respuesta automática a incidentes de seguridad. Cuando se detecta una amenaza, el sistema no solo genera alertas, sino que toma acciones inmediatas: bloquea IPs maliciosas, crea tickets automáticos y notifica a los equipos especializados por múltiples canales (email, Slack, base de datos).

## Componentes Clave

Auto-bloqueo de IPs:

Webhook: Recibe alertas en tiempo real.
Lógica: Bloquea IPs si threat_score ≥ 80 (30 días) o ≥ 60 (24 horas).
Base de datos: Registra IPs bloqueadas en la tabla blocked_ips.

## Sistema de Tickets:

Asignación: Dirige tickets a equipos según el tipo de amenaza (ej: SSH → SOC Team).
Notificaciones: Envía alertas por email y Slack.

## Integración con ELK:

Registra acciones en Logstash para auditoría y visualización en Kibana.

## Pruebas y Comandos

Auto-bloqueo:
bash
Copiar

curl -X POST http://localhost:5678/webhook/auto-block -H "Content-Type: application/json" -d '{"source_ip": "192.168.1.100", "threat_score": 85, "severity": "high"}'

Tickets:
bash
Copiar

curl -X POST http://localhost:5678/webhook/create-ticket -H "Content-Type: application/json" -d '{"source_ip": "10.0.0.50", "risk_score": 75, "title": "SQL Injection"}'

Verificación en PostgreSQL:
bash
Copiar

docker exec security-postgres psql -U db_user -d security_monitoring -c "SELECT * FROM blocked_ips;"
docker exec security-postgres psql -U db_user -d security_monitoring -c "SELECT * FROM security_tickets;"

## Resultados Esperados

Tiempo de respuesta: < 5 segundos.
Canales de notificación: Email, Slack, PostgreSQL.
Impacto: Automatiza el 80% de tareas repetitivas y mejora la trazabilidad.


## Herramientas de analisis
Esto es lo ultimo que hemos hecho hasta el momento. Hemos implementado las herramientas Prometheus/Alertmanager y Fail2ban. Estas nos permiten que nuestro sistema sea mas profesional y seguro, registrando y manejando eficientemente las alertas y bloqueando instantaneamente a aquellas IPs catalogadas como maliciosas.
-Fail2ban: En su carpeta correspondiente, hemos configurado el jail, donde le especificamos que al momento de banear ignore nuestra IP (ya que somos nosotros mismos, y en caso de pruebas podria banearnos), y el archivo que debera leer en busca de instrucciones de baneo. Esto funciona ya que en el nodo 4 (auto bloqueo de IPs) hemos colocado un nodo que escribe en el archivo en cuestion, por lo que cuando se activa, el archivo es modificado y fail2ban detecta ese cambio, ejecutando el baneo.
-Fail2ban-exporter: Actua como puente entre Fail2ban y Prometheus.
-Alertmanager/Prometheus: Este conjunto de herramientas nos sirve para garantizar la disponibilidad y el monitoreo de métricas de nuestra infraestructura y vigilar que el sistema no se sature ni falle. Prometheus se conecta a Fail2ban-exporter para extraer datos sobre cuántas IPs están siendo bloqueadas en tiempo real y cuántos intentos fallidos se detectan. Alertmanager tambien envia una notificacion a Slack, corroborando que el baneo fue efectivo.

# Fuentes de informacion
 - El curso de videos del profesor Ariel Enferrel acerca de Docker.
 - GitHub proporcionado por los profesores. Esto fue de vital importancia para las partes de Syslog-ng (archivo .conf), Logstash y la creacion de la base de datos de PostgreSQL, ademas de los nodos de N8N.
 - Consultas a IA sobre solucion de problemas puntuales, por ejemplo, personalizaciones o cambios pequeños en el syslog.conf, para que pueda funcionar.
 - https://aprendiendoarduino.wordpress.com/tag/flujos-node-red/
 - Videos de N8N: 
   https://www.youtube.com/watch?v=3IvcIPDGB1k
   https://www.youtube.com/watch?v=llzEpKUxl9E&list=PLMd59HZRUmEjuFxu8hsAvErZkn0_W-A6b (Proporcionado por los profesores)
 -Fail2ban: https://youtu.be/kgdoVeyoO2E?si=0zoXm4h6aHaLLAeP
-Alertmanager/Prometheus: 
  https://www.youtube.com/watch?v=93aafqTJRwQ
  https://youtu.be/2fDFLc7Yovc?si=Qy9TXjG11UF3pFMD
  https://youtu.be/QKkrsY-sndg?si=QQER5zQkAEV1JzK6
-Trabajar con Slack:
 https://www.youtube.com/watch?v=md6KZo_-bfw&t=44s
 https://www.youtube.com/watch?v=md6KZo_-bfw&t=44s

## Integración de Wazuh SIEM
Wazuh es una plataforma open-source de seguridad que actúa como SIEM (Security Information and Event Management). En este ejercicio integramos Wazuh al stack existente para obtener monitoreo en tiempo real de agentes, correlación de eventos y visualización de alertas de seguridad.
Componentes agregados al stack

Wazuh Manager: Motor central de análisis y correlación (puerto 55000 API, 1516 agentes)
Wazuh Indexer: Base de datos OpenSearch para almacenamiento de eventos (puerto 9201)
Wazuh Dashboard: Interfaz web de visualización (puerto 5602)

# Consideraciones importantes antes de levantar el stack
Archivo wazuh.yml (Dashboard → Manager)
El archivo wazuh/dashboard/wazuh.yml usa el nombre de servicio Docker en lugar de IP, ya que las IPs son dinámicas y cambian al recrear contenedores:
yamlhosts:
  - default:
      url: http://wazuh-manager
      port: 55000
      username: wazuh-wui
      password: "MyS3cr37P450r"
      run_as: false
Este archivo está montado como :ro (read-only). No cambiar a :rw porque el script de inicio del contenedor sobreescribiría el archivo y corrompería el YAML.
Archivo api.yaml (seguridad de la API)
El archivo wazuh/manager/etc/api.yaml tiene use_only_authd: no. No revertir a yes porque causa timeout y error 500 en el plugin del dashboard.
client.keys (registro de agentes)
El archivo wazuh/manager/etc/client.keys está montado como volumen desde el host para que los agentes registrados persistan aunque se recree el contenedor. Si se borra, hay que volver a registrar los agentes.
Levantar el stack
bashdocker compose up -d
Verificar que los tres componentes estén corriendo:
bashdocker ps | grep wazuh
Acceder al dashboard: http://localhost:5602

Usuario: admin
Contraseña: Admin1234!

# Problema conocido en Windows: localhost no responde
Si localhost:5602 no responde pero 127.0.0.1:5602 sí, ejecutar en PowerShell como administrador y reiniciar el equipo:
powershellnetsh winsock reset
netsh int ip reset
Registrar un agente Windows
# Paso 1 — Descargar el instalador
Descargar wazuh-agent-4.7.2-1.msi desde https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-windows.html
# Paso 2 — Instalar el agente (PowerShell como administrador)
powershellmsiexec /i "C:\Users\TU_USUARIO\Downloads\wazuh-agent-4.7.2-1.msi" /q WAZUH_MANAGER="localhost" WAZUH_AGENT_NAME="nombre-equipo"
# Paso 3 — Configurar el puerto en ossec.conf
Editar C:\Program Files (x86)\ossec-agent\ossec.conf y verificar que tenga:
xml<client>
  <server>
    <address>localhost</address>
    <port>1516</port>
    <protocol>tcp</protocol>
  </server>
</client>
# Paso 4 — Registrar el agente en el manager
bashdocker exec wazuh-manager bash -c "touch /var/ossec/etc/client.keys && chmod 640 /var/ossec/etc/client.keys && chown root:wazuh /var/ossec/etc/client.keys"
docker exec -it wazuh-manager /var/ossec/bin/manage_agents -a "any" -n "nombre-equipo"
docker exec -it wazuh-manager /var/ossec/bin/manage_agents -e 001
Copiar la clave que aparece e importarla en Windows:
powershell& "C:\Program Files (x86)\ossec-agent\manage_agents.exe" -i "CLAVE_AQUI"
# Paso 5 — Crear grupo default y reiniciar
bashdocker exec wazuh-manager bash -c "mkdir -p /var/ossec/etc/shared/default && chown -R wazuh:wazuh /var/ossec/etc/shared/default && echo '<agent_config></agent_config>' > /var/ossec/etc/shared/default/agent.conf && chown wazuh:wazuh /var/ossec/etc/shared/default/agent.conf"
docker restart wazuh-manager
# Paso 6 — Iniciar el servicio del agente
powershellNET START WazuhSvc
# Paso 7 — Verificar que el agente está activo
bashdocker exec wazuh-manager /var/ossec/bin/agent_control -l
Resultado esperado:
ID: 000, Name: wazuh-manager (server), IP: 127.0.0.1, Active/Local
ID: 001, Name: nombre-equipo, IP: any, Active
Integración con n8n (subworkflow Wazuh)
El workflow principal workflow_fase-3_FINAL envía alertas enriquecidas al subworkflow subworkflow_wazuh_monitor via webhook en http://localhost:5678/webhook/wazuh-monitor.
Importar los workflows en n8n

Importar primero subworkflow_wazuh_monitor_v3.json
Importar después workflow_fase-3_final.json
En el subworkflow, configurar las credenciales Wazuh API (Basic Auth):

Usuario: wazuh-wui
Contraseña: MyS3cr37P450r


Activar ambos workflows

Flujo de datos con Wazuh

n8n detecta amenaza en logs → enriquece con Threat Intel
Workflow principal llama al subworkflow via webhook
Subworkflow obtiene token JWT de la API de Wazuh
Envía el evento a http://wazuh-manager:55000/events
Envía también a Logstash para trazabilidad en ELK
El evento aparece en el dashboard de Wazuh → Security → Events

Verificar que Wazuh recibe eventos
bashdocker exec wazuh-manager tail -20 /var/ossec/logs/ossec.log
Verificaciones de estado
bash# Agentes conectados
docker exec wazuh-manager /var/ossec/bin/agent_control -l

# Log del plugin dashboard
docker exec wazuh-dashboard cat /usr/share/wazuh-dashboard/data/wazuh/logs/wazuhapp.log | tail -10

# Log del manager
docker exec wazuh-manager tail -20 /var/ossec/logs/ossec.log
Resultados obtenidos

Wazuh Manager, Indexer y Dashboard operativos e integrados al stack
Agente Windows registrado y activo (ID: 001)
Plugin dashboard conectado al manager via nombre DNS Docker
Eventos de seguridad generados por n8n visibles en Wazuh → Security
Subworkflow n8n enviando alertas a Wazuh via JWT

# Fuentes de información

Documentación oficial Wazuh 4.7: https://documentation.wazuh.com/4.7/
Wazuh Docker deployment: https://documentation.wazuh.com/4.7/deployment-options/docker/docker-installation.html
Wazuh API reference: https://documentation.wazuh.com/4.7/user-manual/api/reference.html

# Avances 5/4
El alerts no funcionaba, ahora recolecta los logs que se envian (al menos por terminal, con la forma mas fiel de simularlos).
N8N ahora lee el archivo alerts y al terminar todo el trabajo del workflow principal borra su contenido para evitar volver a procesar los mismos logs. Ademas, fue modificado para que sea capaz de procesar 5 logs en una ejecucion, separando cada proceso.
N8N ahora envia a postgres 2 datos mas que estaban null en la tabla, ahora funciona todo (creo que no falta nada por este lado).
Use el logstash correcto.
Cree mi agente en wazuh.
Hubo problemas con kibana y wazuh: 
 -no puedo ver los datos en wazuh
 -arregle kibana, tengo mi tabla y el indice n8n-alerts* y exporte el ndjson
Creo que esta todo listo, solo falta arreglar wazuh y asegurarse que tanto eso como kibana funcionen.
