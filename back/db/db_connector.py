import asyncpg
import os

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
    rows = await conn.fetch("SELECT doi, title, publish_date, url, authors FROM articles")
    await conn.close()
    
    # Return articles as a list of dictionaries
    return [{
        "doi": r["doi"],
        "title": r["title"],
        "publish_date": r["publish_date"].isoformat() if r["publish_date"] else None,
        "url": r["url"],
        "authors": r["authors"]
    } for r in rows]

async def get_article_by_doi(doi: str):
    """Fetch a specific article by DOI from the database."""
    conn = await get_connection()
    print(doi)
    article = await conn.fetchrow("SELECT * FROM articles WHERE doi = $1", doi)
    
    if not article:
        await conn.close()
        return None
    
    result = {
        "doi": article["doi"],
        "title": article["title"],
        "publish_date": article["publish_date"].isoformat() if article["publish_date"] else None,
        "url": article["url"],
        "authors": article["authors"],
        "citations": article["citations"],  # Handle citations as well
    }

    await conn.close()
    return result

async def get_article_references(doi: str):
    """Fetch references for a given article by DOI."""
    conn = await get_connection()
    rows = await conn.fetch("SELECT target_doi FROM references WHERE source_doi = $1", doi)
    await conn.close()
    return [r["target_doi"] for r in rows]

async def add_article(title: str, publish_date: str, authors: list, url: str, doi: str):
    """Add a new article to the database."""
    conn = await get_connection()
    await conn.execute("""
        INSERT INTO articles (doi, title, publish_date, authors, url) 
        VALUES ($1, $2, $3, $4, $5)
        """, doi, title, publish_date, authors, url)
    await conn.close()

async def update_article_citations(doi: str, citations: list):
    """Update the citations of a specific article by DOI."""
    conn = await get_connection()
    await conn.execute("""
        UPDATE articles 
        SET citations = $1 
        WHERE doi = $2
        """, citations, doi)
    await conn.close()
