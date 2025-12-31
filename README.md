# Comandos para creacion de clientes y visualización de logs

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
El contenido de esta version esta diseñado para cumplir con las consignas del ejercicio 1 y 2 (parte 1) del github: 
Ejercicio 1:
- Syslog-ng configurado como servidor central
- Tres clientes simulados enviando logs
- Verificacion de recepcion centralizada
Ejercicio 2:
- Crear 5 reglas personalizadas de deteccion

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec -it syslog-ng cat /var/log/security/alerts.log
cat: /var/log/security/alerts.log: No such file or directory

PS C:\Users\rafan\OneDrive\Documentos\EquipoBotRojo.Proyecto3> docker exec -it syslog-ng cat /var/log/security/failed_ssh.log

Estos comandos no funcionan todavia debido a una configuracion presente en syslog: 

filter f_ssh_failed {
    facility(auth, authpriv) and
    match("Failed password" value("MESSAGE"));
};

Esta parte: facility(auth, authpriv); dificulta la creacion de logs manuales, pero el sistema funciona correctamente.

El paso de instalacion de Elasticsearch (paso 3) se realiza mediante Docker Compose en lugar de instalacion directa sobre el sistema operativo, cumpliendo la misma funcionalidad de forma portable y reproducible.

Para el paso 4, se usa el comando Invoke-WebRequest -UseBasicParsing http://localhost:9200/_cat/indices?v para comprobar que la conexion entre elasticsearch y logstash funcione.

Para el paso 5, se creo una carpeta llamada db donde esta el archivo schema.sql, donde esta la creacion de tablas e indices (la creacion de la base de datos esta comentada porque Docker ya se encarga de eso, por lo que daria error) 

## flujos de n8n
cada nodo:
1. Schedule Trigger: "Despierta" cada 5 minutos para iniciar el análisis
2. Simulate Logs: Fabrica eventos de seguridad como si vinieran de syslog
3. Parse Logs: Extrae IPs, usuarios, tipos de ataque de texto crudo
4. Apply Rules: Pregunta a PostgreSQL: "¿Estos eventos violan alguna regla?"
5. Check Severity: Decide: ¿Es alerta real (high/medium) o solo info?
6. Store Alerts (rama YES): Guarda en DB para historial e investigación
7. Send Notifications: Prepara avisos (en consola, listos para email/Slack)
8. Log Only (rama NO): Registra que no pasó nada importante
9. Update Patterns: Cierra el ciclo, actualiza estadísticas
