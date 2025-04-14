import asyncpg
import os

import dotenv

dotenv.load_dotenv()

DB_CONFIG = {
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "cf_test"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
}


async def get_connection():
    """Establish a connection to the PostgreSQL database."""
    return await asyncpg.connect(**DB_CONFIG)

async def get_all_articles():
    """Fetch all articles from the database."""
    conn = await get_connection()
    rows = await conn.fetch("SELECT doi, title, publish_date, url, authors, citations FROM articles LIMIT 1000")
    await conn.close()
    
    # Return articles as a list of dictionaries
    return [{
        "doi": r["doi"],
        "title": r["title"],
        "date": r["publish_date"].isoformat() if r["publish_date"] else None, 
        "url": r["url"],
        "authors": r["authors"],
        "topics": ["ML"],
        "refs": r["citations"]

    } for r in rows]
