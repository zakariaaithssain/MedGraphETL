from fastapi import Request, APIRouter


graph_router = APIRouter()



@graph_router.get("/info")
def get_graph_info(request: Request):
    driver = request.app.state.driver

    query = """
    CALL {
        MATCH (n) RETURN count(n) AS node_count
    }
    CALL {
        MATCH ()-[r]->() RETURN count(r) AS relation_count
    }
    CALL {
        CALL db.labels() YIELD label RETURN collect(label) AS labels
    }
    CALL {
        CALL db.relationshipTypes() YIELD relationshipType
        RETURN collect(relationshipType) AS relation_types
    }
    RETURN node_count, relation_count, labels, relation_types
    """

    with driver.session() as session:
        record = session.run(query).single()

    return {
        "nodes": record["node_count"],
        "relations": record["relation_count"],
        "labels": record["labels"],
        "relation_types": record["relation_types"],
    }
