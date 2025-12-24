from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from contextlib import asynccontextmanager
from dotenv import load_dotenv

import uvicorn
import os

from routers.nodes import nodes_router
from routers.relations import relations_router
from routers.graph_info import graph_router

load_dotenv()



@asynccontextmanager
async def lifespan(app: FastAPI):
    NEO4J_URI = os.getenv("NEO4J_URI")
    NEO4J_USER = os.getenv("NEO4J_USERNAME")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]): 
        raise RuntimeError("Neo4j environment variables are missing, make sure .env file exists in root")
    
    driver = None
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        app.state.driver = driver
        yield
    finally: 
        if driver: driver.close()
    

app = FastAPI(title="MedGraphETL API", version="1.0.0", lifespan=lifespan)
# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes_router)
app.include_router(relations_router)
app.include_router(graph_router)


@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "message": "MedGraphETL API Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "relationships": "/relations (GET)",
            "nodes": "/nodes (GET)",
            "docs(Swagger UI)": "/docs",
        }
    }



@app.get("/health")
async def health_check(request: Request):
    """Health check endpoint"""
    try:
        with request.app.state.driver.session() as session:
            session.run("RETURN 1")
        return {"status": "healthy"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unhealthy: {str(e)}")
    


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)