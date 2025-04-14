import asyncpg
import os

DB_CONFIG = {
    "user": os.getenv("DB_USER", "myuser"),
    "password": os.getenv("DB_PASSWORD", "mypassword"),
    "database": os.getenv("DB_NAME", "mydatabase"),
    "host": os.getenv("DB_HOST", "db"),
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
        "url": r["url"],
        "authors": r["authors"],
        "topics": []
    } for r in rows]

async def get_article_by_doi(doi: str):
    """Fetch a specific article by DOI from the database."""
    conn = await get_connection()
    print(doi)
    article = await conn.fetchrow("SELECT * FROM articles WHERE doi = $1", doi)
    
    if not article:
        await conn.close()
        return None
    
    # id: node.doi,
    # title: details.title,
    # authors: details.authors,
    # topics: details.topics,
    # url: details.url,
    # refs: details.refs,
    # date: details.date
    
    result = {
        "doi": article["doi"],
        "title": article["title"],
        "authors": article["authors"],
        "topics": [],
        "url": article["url"],
        "refs": article["citations"],
        "date": article["publish_date"].isoformat() if article["publish_date"] else None      
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
