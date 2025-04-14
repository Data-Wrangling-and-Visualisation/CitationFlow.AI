from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.db_connector import get_all_nodes, get_node_by_doi, get_refs_by_doi

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
    return await get_all_nodes()

@app.get("/node/{doi}")
async def get_node(doi: str):
    node = await get_node_by_doi(doi)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@app.get("/refs/{doi}")
async def get_refs(doi: str):
    return await get_refs_by_doi(doi)
