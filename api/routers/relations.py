from fastapi import Request, Query, HTTPException, APIRouter
from typing import Optional

from .helpers import *



relations_router = APIRouter()



@relations_router.get("/relations")
def get_relations(
    request: Request,
    type: str,
    source_cui: Optional[str] = None,
    target_cui: Optional[str] = None,
    limit: int = Query(10, gt=0, le=10000),
):
    driver = request.app.state.driver

    if source_cui and target_cui:
        query = f"""
        MATCH (a)-[r:{type.upper()}]->(b)
        WHERE a.cui = $source AND b.cui = $target
        RETURN r, a AS source, b AS target
        """
        params = {"source": source_cui, "target": target_cui}

    elif source_cui:
        query = f"""
        MATCH (a)-[r:{type.upper()}]->(b)
        WHERE a.cui = $source
        RETURN r, a AS source, b AS target
        """
        params = {"source": source_cui}

    elif target_cui:
        query = f"""
        MATCH (a)-[r:{type.upper()}]->(b)
        WHERE b.cui = $target
        RETURN r, a AS source, b AS target
        """
        params = {"target": target_cui}

    else:
        query = f"""
        MATCH (a)-[r:{type.upper()}]->(b)
        RETURN r, a AS source, b AS target
        LIMIT $limit
        """
        params = {"limit": limit}


    with driver.session() as session:
        result = session.run(query, params)
        relations = [{
                        "relationship" : {"type" : type} | serialize_relation(record["r"]), 
                        "source" : serialize_node(record["source"]), 
                        "target" : serialize_node(record["target"])
                      }
                        for record in result]

    if not relations:
        raise HTTPException(404, "Relation(s) not found")

    return relations
