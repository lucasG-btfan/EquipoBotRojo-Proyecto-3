# Tasks: auth-backend (CH02)

## 1. Login endpoint
- [x] 1.1 POST /api/auth/login — valida credenciales contra env vars
- [x] 1.2 Respuesta exitosa: `{ "access_token": "...", "token_type": "bearer" }`
- [x] 1.3 Respuesta error: 401 `{ "detail": "Credenciales inválidas" }`
- [x] 1.4 Body vacío: 422 Validation Error

## 2. JWT
- [x] 2.1 `crear_token_acceso()` — firma con JWT_SECRET, expiración configurable
- [x] 2.2 Payload: `{"sub": "admin", "exp": ...}`
- [x] 2.3 Algoritmo: HS256

## 3. Middleware de autenticación
- [x] 3.1 `get_current_user()` — extrae token del header Authorization
- [x] 3.2 Token inválido o ausente → 401
- [x] 3.3 Token válido → retorna payload `{"usuario": "admin"}`

## 4. Protección de rutas
- [x] 4.1 Dependency `usuario_actual` en `dependencies.py`
- [x] 4.2 `Depends(usuario_actual)` en routers: contenedores (2 endpoints)
- [x] 4.3 `Depends(usuario_actual)` en routers: alertas (2 endpoints)
- [x] 4.4 `Depends(usuario_actual)` en routers: ips (3 endpoints)
- [x] 4.5 `Depends(usuario_actual)` en routers: prometheus (2 endpoints)
- [x] 4.6 `Depends(usuario_actual)` en routers: logs (1 endpoint)
- [x] 4.7 `Depends(usuario_actual)` en routers: workflows (2 endpoints)
- [x] 4.8 `Depends(usuario_actual)` en routers: tickets (1 endpoint)
- [x] 4.9 `Depends(usuario_actual)` en routers: fail2ban (1 endpoint)
- [x] 4.10 `Depends(usuario_actual)` en routers: wazuh (1 endpoint)
- [x] 4.11 `Depends(usuario_actual)` en routers: metrics (1 endpoint)
- [x] 4.12 `/api/auth/login` SIN protección (excluido)
- [x] 4.13 `/api/health` SIN protección (excluido)

## 5. Seguridad
- [x] 5.1 Comparación timing-safe con `hmac.compare_digest`
- [x] 5.2 Expiración JWT configurable (default 8 horas)
- [x] 5.3 Sin almacenamiento de hash de contraseña

## 6. Verificación
- [x] 6.1 Login credenciales válidas → 200 + JWT
- [x] 6.2 Login credenciales incorrectas → 401
- [x] 6.3 Ruta sin token → 403
- [x] 6.4 Ruta token inválido → 401
- [x] 6.5 Ruta token válido → 200
- [x] 6.6 Health sin auth → 200
- [x] 6.7 Batch 12 rutas protegidas → todas 403 sin token
