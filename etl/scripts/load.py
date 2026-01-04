from typing import Optional

from modules.neo4j import Neo4jConnector
from config.settings import NEO4J_AUTH, NEO4J_URI



def load_to_Neo4j(labels_to_load:Optional[list[str]] = None,
                ents_clean_csv:Optional[str]= None,
                only_related: bool = True, 
                reltypes_to_load:Optional[list[str]] = None,
                rels_clean_csv:Optional[str] = None,

                load_batch_size = 1000):
    
        nodes_args_provided = bool(labels_to_load) and bool(ents_clean_csv)
        rels_args_provided = bool(reltypes_to_load) and bool(rels_clean_csv) 
        
        if not (nodes_args_provided or rels_args_provided):
            raise ValueError("Must provide either (labels_to_load AND ents_clean_csv) or (reltypes_to_load AND rels_clean_csv) or both")

        try:
            with Neo4jConnector(uri=NEO4J_URI,
                                    auth=NEO4J_AUTH,
                                    load_batch_size=load_batch_size) as connector:
                if nodes_args_provided:
                    connector.load_ents_to_Neo4j(labels_to_load, ents_clean_csv, only_related, rels_clean_csv)
                
                if rels_args_provided: 
                    connector.load_rels_to_Neo4j(reltypes_to_load, rels_clean_csv)
        
        except KeyboardInterrupt:
            raise
        except Exception:
            raise
    
        