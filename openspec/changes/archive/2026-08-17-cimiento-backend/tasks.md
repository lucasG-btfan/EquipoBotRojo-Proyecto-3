# Tasks: cimiento-backend

## 1. Estructura base y configuración
- [x] 1.1 Crear requirements.txt con todas las dependencias
- [x] 1.2 Crear config.py con pydantic-settings (todas las env vars)
- [x] 1.3 Crear database.py con engine async y session factory
- [x] 1.4 Crear __init__.py para backend, models, schemas, routers, services

## 2. App principal y CORS
- [x] 2.1 Crear main.py con FastAPI, lifespan, CORS middleware
- [x] 2.2 Agregar endpoint GET /api/health

## 3. Autenticación JWT
- [x] 3.1 Crear auth.py con create_access_token y get_current_user
- [x] 3.2 Crear schemas/auth.py con LoginRequest y TokenResponse
- [x] 3.3 Crear routers/auth.py con POST /api/auth/login (implementación completa)

## 4. Modelos SQLAlchemy
- [x] 4.1 Crear models/alerta.py (tabla alerts)
- [x] 4.2 Crear models/patron_ataque.py (tabla attack_patterns)
- [x] 4.3 Crear models/metrica_sistema.py (tabla system_metrics)
- [x] 4.4 Crear models/ip_bloqueada.py (tabla blocked_ips)
- [x] 4.5 Crear models/ticket.py (tabla security_tickets)
- [x] 4.6 Crear dependencies.py

## 5. Schemas Pydantic
- [x] 5.1 schemas/alerta.py
- [x] 5.2 schemas/patron_ataque.py
- [x] 5.3 schemas/metrica_sistema.py
- [x] 5.4 schemas/ip_bloqueada.py
- [x] 5.5 schemas/ticket.py
- [x] 5.6 schemas/contenedor.py
- [x] 5.7 schemas/prometheus.py
- [x] 5.8 schemas/fail2ban.py
- [x] 5.9 schemas/wazuh.py
- [x] 5.10 schemas/workflows.py
- [x] 5.11 schemas/auth.py (ya en 3.2)
- [x] 5.12 schemas/__init__.py con imports de todos

## 6. Routers stub
- [x] 6.1 routers/contenedores.py
- [x] 6.2 routers/prometheus.py
- [x] 6.3 routers/alertas.py
- [x] 6.4 routers/logs.py
- [x] 6.5 routers/workflows.py
- [x] 6.6 routers/ips.py
- [x] 6.7 routers/tickets.py
- [x] 6.8 routers/fail2ban.py
- [x] 6.9 routers/wazuh.py
- [x] 6.10 routers/metrics.py
- [x] 6.11 auth.py (ya en 3.3)
- [x] 6.12 routers/__init__.py con router registry

## 7. Service stubs
- [x] 7.1 services/docker_service.py
- [x] 7.2 services/prometheus_service.py
- [x] 7.3 services/n8n_service.py
- [x] 7.4 services/fail2ban_service.py
- [x] 7.5 services/wazuh_service.py
- [x] 7.6 services/__init__.py

## 8. Verificación
- [x] 8.1 pip install -r requirements.txt funciona
- [x] 8.2 Servidor arranca sin errores (DB warning esperado sin Docker stack)
- [x] 8.3 POST /api/auth/login funciona con credenciales válidas → JWT token
- [x] 8.4 Stub endpoints retornan 200 con mensaje "Endpoint no implementado"
- [x] 8.5 GET /api/health retorna {"estado": "ok"}
