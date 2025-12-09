from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from neo4j import GraphDatabase
from contextlib import asynccontextmanager
from dotenv import load_dotenv

import uvicorn
import os

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifespan - startup and shutdown"""
    # Startup
    yield
    # Shutdown
    if driver:
        driver.close()

app = FastAPI(title="Neo4j API", version="1.0.0", lifespan=lifespan)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j driver initialization
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()
except Exception as e:
    print(f"Failed to connect to Neo4j: {e}")
    driver = None

# Request/Response models
@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "message": "Neo4j API Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "relationships": "/relationships (POST)",
            "entities": "/entities (GET)",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }

# Request/Response models
class RelationshipRequest(BaseModel):
    nodes: List[str]
    relationships: List[str]
    limit: Optional[int] = 1000
    export_format: Optional[str] = "d3"

class Node(BaseModel):
    id: int
    name: str
    label: str

class Link(BaseModel):
    source: int
    target: int
    type: str

class GraphData(BaseModel):
    nodes: List[Node]
    links: List[Link]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        if driver:
            with driver.session() as session:
                session.run("RETURN 1")
            return {"status": "healthy"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unhealthy: {str(e)}")

@app.post("/relationships", response_model=GraphData)
async def get_relationships(request: RelationshipRequest):
    """
    Fetch relationships from Neo4j in D3-compatible format
    
    Request body:
    {
        "nodes": ["CANCER", "CELL"],
        "relationships": ["ASSOCIATED_WITH", "AFFECTS"],
        "limit": 1000,
        "export_format": "d3"
    }
    """
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j driver not initialized")
    
    if not request.nodes or not request.relationships:
        raise HTTPException(status_code=400, detail="nodes and relationships required")
    
    try:
        # Build Cypher query
        node_label = request.nodes[0]
        rel_type = request.relationships[0]
        cypher_query = f"""
        MATCH (n:{node_label})-[r:{rel_type}]-(m)
        RETURN n, r, m
        LIMIT {request.limit}
        """
        
        nodes = []
        links = []
        node_ids = {}  # Map of neo4j node id to index in nodes array
        
        with driver.session() as session:
            result = session.run(cypher_query)
            for record in result:
                source_node = record['n']
                target_node = record['m']
                relationship = record['r']
                
                # Add source node if not already added
                if source_node.id not in node_ids:
                    node_idx = len(nodes)
                    node_ids[source_node.id] = node_idx
                    nodes.append({
                        "id": source_node.id,
                        "name": source_node.get('name', str(source_node.id)),
                        "label": list(source_node.labels)[0] if source_node.labels else "Node"
                    })
                
                # Add target node if not already added
                if target_node.id not in node_ids:
                    node_idx = len(nodes)
                    node_ids[target_node.id] = node_idx
                    nodes.append({
                        "id": target_node.id,
                        "name": target_node.get('name', str(target_node.id)),
                        "label": list(target_node.labels)[0] if target_node.labels else "Node"
                    })
                
                # Add relationship (skip self-links)
                source_idx = node_ids[source_node.id]
                target_idx = node_ids[target_node.id]
                
                if source_idx != target_idx:  # Skip self-referencing links
                    links.append({
                        "source": source_idx,
                        "target": target_idx,
                        "type": relationship.type
                    })
        
        # Convert to D3 format (indices are already correct)
        if request.export_format == "d3":
            return GraphData(nodes=nodes, links=links)
        
        return GraphData(nodes=nodes, links=links)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/entities")
async def get_entities(label: Optional[str] = None, limit: int = 100):
    """Fetch all entities from Neo4j"""
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j driver not initialized")
    
    try:
        if label:
            query = f"MATCH (n:{label}) RETURN n LIMIT {limit}"
        else:
            query = f"MATCH (n) RETURN n LIMIT {limit}"
        
        entities = []
        with driver.session() as session:
            result = session.run(query)
            for record in result:
                node = record['n']
                entities.append({
                    "id": node.id,
                    "properties": dict(node),
                    "labels": list(node.labels)
                })
        
        return {"entities": entities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)