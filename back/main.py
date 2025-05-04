from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.db_connector import get_all_articles
import uvicorn

import dotenv
import os

dotenv.load_dotenv()

app = FastAPI()

origins = [
    os.getenv("HOST_NAME"),
    os.getenv("HOST_NAME") + ":" + os.getenv("FRONT_PORT"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/nodes")
async def get_nodes(node_num: int = 3280):
    try:
        articles = await get_all_articles(node_num)
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching articles")
    

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
