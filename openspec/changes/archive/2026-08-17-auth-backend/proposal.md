# Proposal: auth-backend (CH02)

## Resumen

Implementar autenticación completa para el SIEM Dashboard: endpoint de login, generación y verificación de JWT, y middleware de protección en todas las rutas del backend.

## Problema

El backend expone endpoints sin ningún tipo de autenticación. Cualquier persona con acceso a la red puede consultar alertas, desbloquear IPs y ejecutar workflows. Se necesita un sistema de autenticación que controle el acceso.

## Solución

1. **POST `/api/auth/login`**: Valida credenciales contra variables de entorno (`DASHBOARD_USER`, `DASHBOARD_PASSWORD`), retorna JWT.
2. **JWT**: Generación con `python-jose`, expiración configurable (8hs), payload `{"sub": "admin"}`.
3. **Middleware**: Dependency `get_current_user` que extrae y valida el token del header `Authorization: Bearer ...`.
4. **Protección de rutas**: Todos los endpoints excepto `/api/auth/login` y `/api/health` requieren token válido.

## Gobernanza

**HIGH** — Afecta seguridad. Contraseñas comparadas con `hmac.compare_digest` (timing-safe).

## Alcance

- `backend/auth.py` — lógica JWT + verificación de credenciales
- `backend/schemas/auth.py` — `LoginRequest`, `TokenResponse`
- `backend/routers/auth.py` — endpoint POST /login
- `backend/dependencies.py` — `usuario_actual`
- 10 routers protegidos con `Depends(usuario_actual)`

## Nota de implementación

CH00 (cimiento-backend) implementó la lógica core de auth (auth.py, router, schemas) como parte de su alcance. CH02 completó la integración agregando `Depends(usuario_actual)` a los 10 routers protegidos, cerrando el gap de seguridad donde las rutas estaban abiertas.
