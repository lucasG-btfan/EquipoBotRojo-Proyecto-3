"""Punto de entrada para levantar el servidor en Windows.

`python -m uvicorn backend.main:app` no sirve en Windows: uvicorn arranca su
propio event loop (con la política Proactor, la default de asyncio en
Windows) *antes* de importar `backend.main`, así que para cuando el módulo
se importa ya es tarde para cambiar la política — el loop ya está creado.
psycopg en modo async no soporta Proactor y todos los endpoints que usan la
base de datos fallan con `psycopg.InterfaceError`.

Este script fija `WindowsSelectorEventLoopPolicy` *antes* de invocar a
uvicorn, para que el loop que uvicorn crea ya nazca con la política correcta.
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000)
