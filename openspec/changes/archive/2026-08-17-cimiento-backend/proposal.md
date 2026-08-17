# Proposal: cimiento-backend

## What
Create a FastAPI backend from scratch for the SIEM Dashboard. This provides the API layer that the React frontend consumes, orchestrating calls to PostgreSQL, Docker, Prometheus, n8n, Fail2ban, and Wazuh.

## Why
The frontend needs a backend API to consume. Without this change, no other change can proceed — this is the foundation (CH00 in the roadmap).

## Scope
- FastAPI project structure with layered architecture (routers → services → models)
- Configuration via pydantic-settings loading from .env
- PostgreSQL connection via SQLAlchemy async + asyncpg
- JWT authentication with a single admin user (DASHBOARD_USER/DASHBOARD_PASSWORD)
- SQLAlchemy ORM models matching BD/schema.sql and BD/schema-extended.sql exactly
- Pydantic response schemas for all entities
- 11 router modules (1 fully implemented: auth, 10 stubs)
- 5 service stubs (docker, prometheus, n8n, fail2ban, wazuh)
- Health check endpoint

## No-alcance
- Frontend (separate change)
- Docker/docker-compose modifications
- n8n workflow modifications
- Database migrations (tables already exist in the Docker stack)
- Full implementation of stub endpoints (each will be implemented in its own change)
