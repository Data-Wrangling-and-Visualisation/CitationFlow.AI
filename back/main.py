import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.db_connector import get_all_articles
import uvicorn

app = FastAPI()

origins = [
    "http://localhost",    
    "http://localhost:80",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/nodes")
async def get_nodes():
    try:
        articles = await get_all_articles()
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching articles")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
