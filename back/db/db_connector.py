import asyncpg
import os

DB_CONFIG = {
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "nodes_db"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
}

async def get_connection():
    return await asyncpg.connect(**DB_CONFIG)

async def get_all_nodes():
    conn = await get_connection()
    rows = await conn.fetch("SELECT doi FROM nodes")
    await conn.close()
    return [{"doi": r["doi"]} for r in rows]

async def get_node_by_doi(doi: str):
    conn = await get_connection()
    node = await conn.fetchrow("SELECT * FROM nodes WHERE doi = $1", doi)
    if not node:
        await conn.close()
        return None

    result = {
        "doi": node["doi"],
        "title": node["title"],
        "authors": node["authors"],
        "topics": node["topics"],
        "url": node["url"],
        "refs": node["refs"],
        "date": node["date"].isoformat() if node["date"] else None,
    }

    await conn.close()
    return result

async def get_refs_by_doi(doi: str):
    conn = await get_connection()
    rows = await conn.fetch("SELECT target_doi FROM references WHERE source_doi = $1", doi)
    await conn.close()
    return [r["target_doi"] for r in rows]
