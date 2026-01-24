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
```json
{
  "timestamp": "2024-01-19T12:30:00Z",
  "source_ip": "192.168.1.100",
  "severity": "high",
  "rule_name": "Failed Login Attempts",
  "source": "n8n",
  "threat_score": 75,
  "message": "Multiple failed login attempts detected"
}

# Fuentes de informacion
 - El curso de videos del profesor Ariel Enferrel acerca de Docker.
 - GitHub proporcionado por los profesores. Esto fue de vital importancia para las partes de Syslog-ng (archivo .conf), Logstash y la creacion de la base de datos de PostgreSQL, ademas de los nodos de N8N.
 - Consultas a IA sobre solucion de problemas puntuales, por ejemplo, personalizaciones o cambios pequeños en el syslog.conf, para que pueda funcionar.
 - https://aprendiendoarduino.wordpress.com/tag/flujos-node-red/
 - Videos de N8N: 
   https://www.youtube.com/watch?v=3IvcIPDGB1k
   https://www.youtube.com/watch?v=llzEpKUxl9E&list=PLMd59HZRUmEjuFxu8hsAvErZkn0_W-A6b (Proporcionado por los profesores)



