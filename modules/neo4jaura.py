#TODO: add logs, tqdms with desc argument, and use Google Docstring format for documentation 
# or maybe let the documentation till I finish the whole project and document for once. 

import pandas as pd

from neo4j import GraphDatabase, Transaction
from neo4j.exceptions import Neo4jError, TransientError
from concurrent.futures import ThreadPoolExecutor, as_completed

from tqdm import tqdm
import logging

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
    and relations types. this can be fixed via APOC, but it's not available for N4J Aura. 
    3 - I want dynamic labels and relation types, and I want efficiency, 
    so I will load each entity or relation type separately using cypher's UNWIND 
    (especially that I already know the entities and rels recognized by the model!!!!). 
      """



class Neo4jAuraConnector:
    def __init__(self, uri: str, auth: tuple, load_batch_size = 1000):
        """I am using Neo4j Aura Free, so I cannot create databases, 
            it uses the default one"""
        self.driver = GraphDatabase.driver(uri, auth=auth, database='neo4j')
        self.load_batch_size = load_batch_size

    #dunder methods for context management
    def __enter__(self):
        try: 
            with self.driver.session() as session: 
                result = session.run("RETURN 1 AS test")
                logging.info("AuraConnector: Successfully Connected To Neo4j Aura.")
        except Exception as e: 
                logging.critical(f"AuraConnector: Connection Failed: {e}")
                raise
        return self
    
    def __exit__(self, exception_type, exception_value, traceback):
        if self.driver: 
            self.driver.close()
            logging.info("AuraConnector: Connector's Driver Closed Successfully.")
        if exception_type: 
            logging.error(f"AuraConnector: {exception_value}")
        return False #don't supress errors

    def load_ents_to_aura(self, labels_to_load : list[str], ents_clean_csv: str):
        assert all(label in NEO4J_LABELS for label in labels_to_load), f"{labels_to_load} contains invalid label(s), valid: {NEO4J_LABELS}"
        """Load entities from the cleaned ents csv to Neo4j Aura. 
        Parameters:
            labels_to_load = list of the entities recognized by the NER model
            that we want to load. (exp: 'GENE')
            ents_clean_csv = path of the cleaned ents csv."""
        
        def _worker(label):
            
                try: #only one transaction per session, and one session per thread
                    with self.driver.session() as session: 
                        with session.begin_transaction() as transaction: 
                            nodes_with_label = self._get_nodes_with_label(label,ents_clean_csv)
                            self._ents_batch_load(label, nodes_list=nodes_with_label, transaction= transaction)
                            transaction.commit()
                    logging.info(f"AuraConnector: loaded {label} nodes")

                except Exception as e:
                    logging.warning(f"AuraConnector: failed to load {label} nodes: {e}")
        
        #I am not specifiying the number of workers as that is causing some latency I guess.
        with ThreadPoolExecutor() as executor: 
            futures = [executor.submit(_worker, label) for label in labels_to_load]
            for future in tqdm(as_completed(futures), desc="loading nodes:", total = len(labels_to_load)): 
                future.result()
            else: 
                logging.info("AuraConnector: loaded nodes successfully.")

        


    def _ents_batch_load(self, label: str, nodes_list: list[dict], transaction: Transaction):
        """loads nodes to Neo4j using UNWIND bulk write
        Parameters:
        label = "the label for the nodes to load. (exp 'GENE')
        nodes_list = list containing nodes to load, each is a dict, they must have the same label.
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
            transaction.run(query, {"nodes":nodes_list})
        except Neo4jError as ne:
            logging.error(f"AuraConnector: Neo4j error: {ne}")
            raise
        except Exception as e:
            logging.error(f"AuraConnector: {e}")
            raise


    def _get_nodes_with_label(self, label : str, ents_clean_csv : str):
        """ return list[dict] containing rows with 
        the same label specified in the label argument, from the global cleaned
        csv that contains all extracted entities.
        Parameters: 
                label = the label of the entities we wish to extract (exp. 'GENE') """
        # Read and preprocess data
        assert label in NEO4J_LABELS, f"label argument got {label}, not one of {NEO4J_LABELS}."
        try: 
            df = pd.read_csv(ents_clean_csv,
                              dtype = {6:str, 7:str, 8:str, 9:str}) #to fix a DtypeWarning 
        except FileNotFoundError as e:
            logging.error(f"AuraConnector: {e}")
            raise
        
        try:
            entities = df[df[":LABEL"] == label].copy()
        except KeyError as e:
            logging.error(f"AuraConnector: {e}. Perhaps You Changed ':LABEL' To Something Else During Cleaning?" )
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
            logging.warning(f"AuraConnector: No {label} Nodes In {ents_clean_csv}.")
            return []
        


    
    def load_rels_to_aura(self, reltypes_to_load: list[str], rels_clean_csv: str):
        assert all(rt in NEO4J_REL_TYPES for rt in reltypes_to_load), \
            f"{reltypes_to_load} contains invalid relation type(s), valid: {NEO4J_REL_TYPES}"

        all_relations = self._all_relations_list(rels_clean_csv)
        #split into non conflicting batches to avoid deadlocks.
        non_conflict_batches = self._create_non_conflicting_batches(all_relations)
        try:
            for batch in tqdm(non_conflict_batches, desc= "loading relations:", total= len(reltypes_to_load)):
                for reltype in reltypes_to_load:
                    self._load_relations_of_type(batch, reltype)
            logging.info("AuraConnector: relations loaded successfully.")
        except Exception as e: 
            logging.error(f"AuraConnector:{e}")
            raise
            
            


    def _load_relations_of_type(self, relations_list: list, reltype: str):
        relations = self._get_relations_of_type(reltype, relations_list)
        try:
            with self.driver.session() as session:
                session.execute_write(self._uow_write_rels, reltype, relations)
        except TransientError as e:
            logging.error(str(e))
            raise
        
    #unity of work called by Neo4j's execute_write, the transaction variable
    def _uow_write_rels(self, tx: Transaction, reltype: str, batch: list[dict]):
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
            tx.run(query, {"relations": batch})

        


    def _create_non_conflicting_batches(self, relations_list: list[dict]):
        """
        Yield batches such that no node id appears twice in the same batch.
        This algorithm implementation is for preventing deadlocks when loading relations."""

        remaining = list(relations_list)
        while remaining:
            used_nodes = set()
            batch = []
            next_remaining = []

            for rel in remaining:
                src = rel["start_id"]
                dest = rel["end_id"]
                if src is None or dest is None:
                    continue

                if src not in used_nodes and dest not in used_nodes:
                    batch.append(rel)
                    used_nodes.add(src)
                    used_nodes.add(dest)
                else:
                    next_remaining.append(rel)

            if batch: yield batch
            remaining = next_remaining      

    
    
    def _get_relations_of_type(self, reltype : str, relations_list: list[dict]):
        """ return list[dict] containing relations with 
        the same type specified in the type argument, from the list of relations
        Parameters: 
                type = the type of the relations we wish to extract (exp. 'AFFECTS')
                relations_list = the list containing all the extracted relations."""
        
        assert reltype in NEO4J_REL_TYPES, f"'type' argument got {reltype}, not one of {NEO4J_REL_TYPES}."
        
        desired_relations = []
        for relation in relations_list:
            if "type" in relation and relation['type'] == reltype:
                desired_relations.append(relation)
        
        return desired_relations
    


    
    def _all_relations_list(self, rels_clean_csv: str) -> list[dict]:
        try: 
            df = pd.read_csv(rels_clean_csv)
        except FileNotFoundError as e:
            logging.error(f"AuraConnector: {e}")
            raise

        if not df.empty: 
            df.rename(columns={":ID": "id", ":START_ID": "start_id",":END_ID": "end_id", ":TYPE" : "type"}, inplace=True, errors='ignore')
            #those will just create redundancy in the graph if kept
            to_drop = [col for col in ["pmid", "fetching_date"] if col in df.columns]
            df.drop(columns=to_drop, inplace=True)
            relations_list = df.to_dict("records")  #convert to list of dicts
            return relations_list
        else: return []
        

        
        