# Design: cimiento-backend

## Architecture
Layered architecture: routers → services → models

```
backend/
├── main.py           ← FastAPI app, lifespan, CORS, router registration
├── config.py         ← pydantic-settings: all env vars
├── database.py       ← async SQLAlchemy engine + session factory
├── auth.py           ← JWT creation/validation, get_current_user dependency
├── dependencies.py   ← Shared FastAPI dependencies
├── routers/          ← API endpoints (thin — delegate to services)
├── services/         ← Business logic (talks to external APIs)
├── models/           ← SQLAlchemy ORM models (maps to DB tables)
└── schemas/          ← Pydantic response/request schemas
```

## Tech Choices
| Concern | Tool | Why |
|---------|------|-----|
| HTTP framework | FastAPI 0.115.x | Async-native, auto-docs, Pydantic integration |
| ORM | SQLAlchemy 2.0 async + asyncpg | Async PostgreSQL, mature ecosystem |
| Config | pydantic-settings 2.7.x | Type-safe env vars, .env loading |
| JWT | python-jose 3.3.x | JWT encode/decode with HS256 |
| HTTP client | httpx 0.28.x | Async HTTP for external API calls |
| Env loading | python-dotenv 1.0.x | .env file support |

## Error Handling
Every endpoint wraps its logic in try/except:
```python
try:
    # business logic
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Error al obtener X: {str(e)}")
```
All error messages in Spanish.

## CORS
Configured via FRONTEND_ORIGIN env var only. NEVER use `allow_origins=["*"]`.
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Auth Flow
1. POST /api/auth/login with `{"usuario": "...", "contraseña": "..."}`
2. Validate using `hmac.compare_digest()` for timing-safe comparison against DASHBOARD_USER/DASHBOARD_PASSWORD
3. Return `{"access_token": "...", "token_type": "bearer"}`
4. JWT payload: `{"sub": "admin", "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)}`
5. All other endpoints require `Authorization: Bearer <token>` header
6. `get_current_user` dependency extracts and validates the token

## Database
- create_async_engine with pool_timeout=3, connect_args={"timeout": 5}
- init_db() creates all tables on startup (create_all), catches exceptions
- Session via async_sessionmaker
