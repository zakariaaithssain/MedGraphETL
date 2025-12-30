
import pandas as pd

from neo4j import GraphDatabase, Transaction
from neo4j.exceptions import Neo4jError, TransientError
from concurrent.futures import ThreadPoolExecutor, as_completed

from collections import defaultdict
from tqdm import tqdm
import logging
import os 
from pathlib import Path

from config.neo4jdb_config import NEO4J_LABELS, NEO4J_REL_TYPES

"""to load data to neo4j, we have multiple options:
    1 - load every entity or relation independently from others. 
    pros: allows dynamic labels and relations types.
    cons: not memory efficient (loops) nor network efficient 
          (1entity or relation/transaction
    2 - use CYPHER methods (either UNWIND or LOAD CSV)
    pros: memory efficient (UNWIND loads a batch, LOAD CSV loads an entire csv at once)
          network efficient (UNWIND: a batch in one connection, LOAD CSV I think the 
          whole csv in one connection)
    cons: uses plain cypher so no formatting is possible for dynamic labels 
    and relations types. this can be fixed via APOC, but it's not available for N4J Neo4j. 
    3 - I want dynamic labels and relation types, and I want efficiency, 
    so I will load each entity or relation type separately using cypher's UNWIND 
    (especially that I already know the entities and rels recognized by the model!!!!). 
      """



class Neo4jConnector:
    def __init__(self, uri: str, auth: tuple, load_batch_size = 1000):
    
        
        self.driver = GraphDatabase.driver(uri, auth=auth)
        self.load_batch_size = load_batch_size

    #dunder methods for context management
    def __enter__(self):
        try: 
            self.driver.verify_connectivity()
            self.driver.verify_authentication()
            logging.info("Neo4jConnector: Successfully Connected To Neo4j Neo4j.")
        except Exception as e: 
            logging.critical(f"Neo4jConnector: Connection Failed: {e}")
            raise
        return self
    
    def __exit__(self, exception_type, exception_value, traceback):
        if self.driver: 
            self.driver.close()
            logging.info("Neo4jConnector: Connector's Driver Closed Successfully.")
        if exception_type: 
            logging.error(f"Neo4jConnector: {exception_value}")
        return False #don't supress errors

    def load_ents_to_Neo4j(self, labels_to_load : list[str], ents_clean_csv: str, only_related: bool, rels_clean_csv: str):
        """Load entities from the cleaned ents csv to Neo4j Neo4j. 
        Parameters:
            labels_to_load = list of the entities recognized by the NER model
            that we want to load. (exp: 'GENE')
            ents_clean_csv = path of the cleaned ents csv
            only_related: if True, we only get labels that has some relation attached to them. 
            rels_clean_csv = path to the relations cleaned csv"""
        assert all(label in NEO4J_LABELS for label in labels_to_load), f"{labels_to_load} contains invalid label(s), valid: {NEO4J_LABELS}"
        
        def _worker(label):
            
                try: #only one transaction per session
                    with self.driver.session() as session: 
                        with session.begin_transaction() as transaction: 
                            nodes_with_label = self._get_nodes_with_label(label,ents_clean_csv, only_related, rels_clean_csv)
                            self._ents_batch_load(label, nodes_batch=nodes_with_label, transaction= transaction)
                    logging.info(f"Neo4jConnector: loaded {label} nodes")

                except Exception as e:
                    logging.warning(f"Neo4jConnector: failed to load {label} nodes: {e}")
        #this max workers is recommended by ChatGPT for I/O bound tasks
        with ThreadPoolExecutor(min(100, os.cpu_count() * 4)) as executor: 
            futures = [executor.submit(_worker, label) for label in labels_to_load]
            for future in tqdm(as_completed(futures), desc="loading nodes:", total = len(labels_to_load)): 
                future.result()
            else: 
                logging.info("Neo4jConnector: loaded nodes successfully.")

        


    def _ents_batch_load(self, label: str, nodes_batch: list[dict], transaction: Transaction):
        """loads nodes batch to Neo4j using UNWIND cypher operation, so all nodes in the batch should have the same label.
        Parameters:
        label = "the label for the nodes to load. (exp 'GENE')
        nodes_batch = list containing nodes to load, each is a dict, they must have the same label.
        transaction = neo4j transaction instance

        """
        
        query = f"""
            UNWIND $nodes AS row
            MERGE (n:{label} {{id: row.id}})
            SET n += {{
                name: row.name,
                cui: row.cui,
                normalized_name: row.normalized_name,
                normalization_source: row.normalization_source
            }}
            """
        try: 
            transaction.run(query, {"nodes":nodes_batch})
            transaction.commit()
        except Neo4jError as ne:
            logging.error(f"Neo4jConnector: Neo4j error: {ne}")
            raise
        except Exception as e:
            logging.error(f"Neo4jConnector: {e}")
            raise


    def _get_nodes_with_label(self, label : str, ents_clean_csv : str, only_related : bool, rels_clean_csv: str):
        """ return list[dict] containing rows with 
        the same label specified in the label argument, from the global cleaned
        csv that contains all extracted entities.
        Parameters: 
                label = the label of the entities we wish to extract (exp. 'GENE')
                ents_clean_csv = path to the entities cleaned csv
                only_related: if True, we only get labels that has some relation attached to them. 
                rels_clean_csv = path to the relations cleaned csv"""
        assert label in NEO4J_LABELS, f"label argument got {label}, not one of {NEO4J_LABELS}."
        try: 
            nodes_df = pd.read_csv(Path(ents_clean_csv),
                              dtype = {6:str, 7:str, 8:str, 9:str}) #to fix a DtypeWarning 
            if only_related:
                logging.info("Loading Process: only nodes with at least one relation will be loaded.")
                rels_df = pd.read_csv(Path(rels_clean_csv))
                related_nodes = set(rels_df[':START_ID']) | set(rels_df[':END_ID'])
                nodes_df = nodes_df[nodes_df[':ID'].isin(related_nodes)]
        except Exception as e:
            logging.error(f"Neo4jConnector: {e}")
            raise
        
        try:
            entities = nodes_df[nodes_df[":LABEL"] == label].copy()
        except KeyError as e:
            logging.error(f"Neo4jConnector: {e}. Perhaps You Changed ':LABEL' To Something Else During Cleaning?" )
            raise

        if not entities.empty: 
            #format for Neo4j
            entities.rename(columns={":ID": "id"}, inplace=True, errors='ignore')
            #those will just create redundancy in the graph if kept
            to_drop = [col for col in [":LABEL", "pmid", "pmcid", "fetching_date"] if col in entities.columns]
            entities.drop(columns=to_drop, inplace=True)
            entities_dict = entities.to_dict("records")  #convert to list of dicts
            return entities_dict
        else:
            logging.warning(f"Neo4jConnector: No {label} Nodes In {ents_clean_csv}.")
            return []
        


    
    def load_rels_to_Neo4j(self, reltypes_to_load: list[str], rels_clean_csv: str):
        assert all(rt in NEO4J_REL_TYPES for rt in reltypes_to_load), \
            f"{reltypes_to_load} contains invalid relation type(s), valid: {NEO4J_REL_TYPES}"

        all_relations = self._all_relations_list(rels_clean_csv)
        connexe_batches = self._create_connected_batches(all_relations)
        
        #this max workers is recommended by ChatGPT for I/O bound tasks
        with ThreadPoolExecutor(min(100, os.cpu_count() * 4)) as executor:
            futures = [executor.submit(self._relations_batch_load, batch, reltypes_to_load) 
                       for batch in connexe_batches]
            
            for bcount, future in enumerate(tqdm(as_completed(futures), desc="loading relations:", total= len(futures))):
                future.result()
                logging.info(f"Neo4jConnector: loaded relations batch {bcount}")

            else: logging.info("Neo4jConnector: loaded relations successfully.")
            
            
    def _relations_batch_load(self, batch: list[dict], reltypes_to_load: list[str]):
        "loads relations contained in the 'batch' if their Type appears in 'reltypes_to_load'."
        for reltype in reltypes_to_load: 
            self._load_relations_of_type(batch, reltype)




    def _load_relations_of_type(self, relations_list: list[dict], reltype: str):
        """Loads relations from 'relations_list' of type 'reltype' to neo4j"""
        relations = self._get_relations_of_type(reltype, relations_list)
        try:
            with self.driver.session() as session:
                session.execute_write(self._uow_write_rels, reltype, relations)
        #errors related to deadlocks
        except TransientError as e: 
            logging.error(f"Neo4jConnector: {e}")
            raise
        
    def _uow_write_rels(self, tx: Transaction, reltype: str, relations: list[dict]):
            """unity of work called by neo4j's 'execute_write' method,
              the tx variable is automatically assigned by neo4j's method."""
            query = f"""
            UNWIND $relations AS row
            MATCH (start {{id: row.start_id}})
            MATCH (end {{id: row.end_id}})
            MERGE (start)-[r:{reltype}]->(end)
            SET r += {{
                pmid: row.pmid,
                pmcid: row.pmcid
            }}
            """
            tx.run(query, {"relations": relations})

        

    
    def _get_relations_of_type(self, reltype : str, relations_list: list[dict]):
        """ return list[dict] containing relations with 
        the same type specified in the type argument, from the list of relations
        Parameters: 
                type = the type of the relations we wish to extract (exp. 'AFFECTS')
                relations_list = the list containing all the extracted relations."""
        
        assert reltype in NEO4J_REL_TYPES, f"'type' argument got {reltype}, not one of {NEO4J_REL_TYPES}."
        
        desired_relations = []
        for relation in relations_list:
            #debugging
            if not isinstance(relation, dict):
                print("BAD RELATION:", relation, type(relation))
            if "type" in relation and relation['type'] == reltype:
                desired_relations.append(relation)
        
        return desired_relations
    


    
    def _all_relations_list(self, rels_clean_csv: str) -> list[dict]:
        """returns a list of dict, each dict represents a relation from the relations CSV file."""
        try: 
            nodes_df = pd.read_csv(Path(rels_clean_csv))
        except FileNotFoundError as e:
            logging.error(f"Neo4jConnector: {e}")
            raise

        if not nodes_df.empty: 
            nodes_df.rename(columns={":ID": "id", ":START_ID": "start_id",":END_ID": "end_id", ":TYPE" : "type"}, inplace=True, errors='ignore')
            #those will just create redundancy in the graph if kept
            to_drop = [col for col in ["pmid", "fetching_date"] if col in nodes_df.columns]
            nodes_df.drop(columns=to_drop, inplace=True)
            relations_list = nodes_df.to_dict("records")  #convert to list of dicts
            return relations_list
        else: return []



    def _create_connected_batches(self, relations_list: list[dict]):
        """
        Yields batches where each batch contains relations belonging 
        to the same connected component. Optimal O(N + R).
        """

        # --------------------------
        # Step 1: Build adjacency list
        # --------------------------
        adj = defaultdict(set)
        nodes = set()

        for rel in relations_list:
            src = rel.get("start_id")
            dest = rel.get("end_id")
            if src is None or dest is None:
                continue

            adj[src].add(dest)
            adj[dest].add(src)

            nodes.add(src)
            nodes.add(dest)

        # --------------------------
        # Step 2: DFS to label components
        # --------------------------
        component_of = {}        # node_id → component_id
        comp_id = 0

        for node in nodes:
            if node not in component_of:
                # start a new component
                stack = [node]

                while stack:
                    n = stack.pop()
                    if n not in component_of:
                        component_of[n] = comp_id
                        stack.extend(adj[n])

                comp_id += 1

        # --------------------------
        # Step 3: Assign relations to batches in one pass
        # --------------------------
        batches = defaultdict(list)  # comp_id → list of relations

        for rel in relations_list:
            src = rel.get("start_id")
            dest = rel.get("end_id")
            if src in component_of:
                cid = component_of[src]
            elif dest in component_of:
                cid = component_of[dest]
            else:
                continue  # skip or create new batch for isolated stuff

            batches[cid].append(rel)

        # --------------------------
        # Step 4: Yield the batches
        # --------------------------
        for batch in batches.values():
            yield batch

            

                

                
                