import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.db_connector import get_all_articles
import uvicorn

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
    try:
        articles = await get_all_articles()
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching articles")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
