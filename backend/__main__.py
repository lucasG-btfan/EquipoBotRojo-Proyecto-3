"""Entry point: python -m backend

Forzar SelectorEventLoop en Windows ANTES de que uvicorn cree su event loop.
El fix en main.py no funciona porque uvicorn ya inicializó el loop al importar
el módulo. Este archivo se ejecuta primero.
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
