from fastapi import APIRouter, Request, Query, HTTPException
from typing import Optional

from .helpers import *

nodes_router = APIRouter()


@nodes_router.get("/nodes")
def get_nodes(
    request: Request,
    label: str,
    cui: Optional[str] = None,
    name: Optional[str] = None,
    limit: int = Query(10, gt=0, le=10000),
):
    driver = request.app.state.driver

    if cui or name:
        query = f"""
        MATCH (n:{label.upper()})
        WHERE ($cui IS NOT NULL AND n.cui = $cui)
           OR ($name IS NOT NULL AND n.name = $name)
           OR ($name IS NOT NULL AND n.normalized_name = $name)
        RETURN n
        """
        params = {"cui": cui, "name": name}
    else:
        query = f"""
        MATCH (n:{label.upper()})
        RETURN n
        LIMIT $limit
        """
        params = {"limit": limit}

    
    with driver.session() as session:
        result = session.run(query, params)
        nodes = [serialize_node(record["n"]) for record in result]

    if not nodes:
        raise HTTPException(404, "Node(s) not found")

    return nodes
