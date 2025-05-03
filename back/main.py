from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.db_connector import get_all_articles
import uvicorn

import dotenv
import os

dotenv.load_dotenv()

app = FastAPI()

origins = [
    "http://" + os.getenv("HOST_NAME"),
    "http://" + os.getenv("HOST_NAME") + ":80",
    "http://" + os.getenv("HOST_NAME") + ":8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/nodes")
async def get_nodes():
    try:
        articles = await get_all_articles()
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching articles")

@app.get("/clusters")
async def get_clusters():
    try:
        clusters = await get_clusters()
        return clusters
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching clusters")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
