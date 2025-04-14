import logging
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.db_connector import get_all_articles, get_article_by_doi, get_article_references
import uvicorn

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/nodes")
async def get_nodes():
    logger.info("Fetching all articles")
    try:
        articles = await get_all_articles()
        logger.info(f"Fetched {len(articles)} articles")
        return articles
    except Exception as e:
        logger.error(f"Error fetching articles: {e}")
        raise HTTPException(status_code=500, detail="Error fetching articles")

@app.get("/node")
async def get_node(doi: str):
    # Decode the DOI before querying
    decoded_doi = urllib.parse.unquote(doi)
    logger.info(f"Fetching article for DOI: {decoded_doi}")
    
    node = await get_article_by_doi(decoded_doi)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@app.get("/refs/{doi}")
async def get_refs(doi: str):
    logger.info(f"Fetching references for article with DOI: {doi}")
    try:
        refs = await get_article_references(doi)
        logger.info(f"Fetched {len(refs)} references for DOI: {doi}")
        return refs
    except Exception as e:
        logger.error(f"Error fetching references for DOI {doi}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching references")

if __name__ == "__main__":
    logger.info("Starting FastAPI application")
    uvicorn.run(app, host="0.0.0.0", port=8000)
