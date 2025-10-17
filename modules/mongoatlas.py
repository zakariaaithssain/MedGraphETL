from pymongo import MongoClient
from pymongo import errors
from pymongo import UpdateOne
from pymongo.server_api import ServerApi
from tqdm import tqdm
from itertools import islice

import logging
import datetime

from config.mongodb_config import DB_STRUCTURE





"""
    a cluster contains multiple databases, a database contains multiple collections,
    a collection contains multiple docs, a doc contains multiple features.
    """

class MongoAtlasConnector:
    def __init__(self, connection_str):
        #create a new client and connect to the server
        self.cluster = MongoClient(host= connection_str, server_api=ServerApi('1'))

        #send a ping to confirm a successful connection
        try:
            self.cluster.admin.command('ping')
            logging.info("AtlasConnector: deployment pinged. Successfully connected to MongoDB Atlas.")
        except Exception as e:
            logging.error(f"AtlasConnector: connection failed: {e}")
            #no need to continue the execution if connection failed
            raise

        self.db = self.cluster[DB_STRUCTURE['database']]
        self.collection = self.db[DB_STRUCTURE['collection']]

        logging.info(f"AtlasConnector: Cluster: {DB_STRUCTURE['cluster']}.")
        logging.info(f"AtlasConnector: DataBase: {DB_STRUCTURE['database']}.")
        logging.info(f"AtlasConnector: Collection: {DB_STRUCTURE['collection']}.")

        # using 'pmid' to prevent duplicates
        self.collection.create_index("pmid", unique=True)

    
    def __enter__(self):
        return self
    
    
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.cluster:
            self.cluster.close()
            logging.info("AtlasConnector: connection closed.")
        if exc_type: 
            logging.exception(f"AtlasConnector: unable to close connection, exception: {exc_val}")



        


    def load_articles_to_atlas(self, all_articles: list[dict], batch_size : int = 10000):
        """Load fetched articles data to MongoDB Atlas cloud. 
            Arguments: 
                    all_articles = list of dictionaries, each corresponds to one article's data."""
        
        logging.info("AtlasConnector: inserting new docs, already present or empty ones are ignored.")
        batches = list(self._batcher(all_articles, batch_size))

        with tqdm(total=len(all_articles), desc="Inserting new docs") as pbar:
            for batch in batches:
                self._helper_load(batch, pbar)
                


            else: logging.info("AtlasConnector: articles inserted successfully to MongoDB Atlas.")
            
        




    def _helper_load(self, batch: list[dict], pbar: tqdm): 
        """Loads a batch of articles to MongoDB Atlas.
        Params: 
                batch: the batch of articles to load
                pbar: tqdm instance to be updated."""
        try:
            operations = []
            for article in batch:
                if article.get("abstract"):  # ignore empty abstracts
                    article["fetchingdate"] = datetime.datetime.now(datetime.timezone.utc)
                    operations.append(
                        UpdateOne(
                            {"pmid": article["pmid"]},
                            {"$setOnInsert": article},
                            upsert=True
                        )
                    )
                    pbar.update(1)
                    pbar.refresh()

            if operations:  # only execute if we have something to insert
                result = self.collection.bulk_write(operations, ordered=False)
                logging.info(f"AtlasConnector: inserted {result.upserted_count} new docs.")

        except errors.BulkWriteError as e:
            logging.error(f"AtlasConnector: Bulk write error: {e.details}")
        except errors.PyMongoError as e:
            logging.error(f"AtlasConnector: unable to store batch of articles: {e}")

    def _batcher(self, all_articles: list, batch_size: int):
            """Create batches of size batch_size of articles list"""
            iterator = iter(all_articles)
            while True: 
                batch = list(islice(iterator, batch_size))
                if not batch: #meaning the iterator is consumed, which will give an empty batch
                    break
                yield batch


    
    def fetch_articles_from_atlas(self, query = {}):
        """
        query = {} to fetch all data.

        """
        articles = []
        try: 
            cursor = self.collection.find(query) #it returns a cursor, we must iterate through it.
        except errors.PyMongoError as e: 
            logging.error(f"AtlasConnector: unable to fetch docs: {e}.")
            raise

        logging.info("AtlasConnector: fetching docs from MongoDB Atlas.")
        articles = []
        for doc in tqdm(cursor, desc="fetching docs from MongoDB Atlas..."):
            article = self._helper_fetch(doc)
            if article:
                articles.append(article)

        logging.info("AtlasConnector: articles fetched successfully from MongoDB Atlas.")
        return articles
    

    def _helper_fetch(self, doc) -> dict:
        """fetches the provided doc from MongoDB Atlas"""
        try:
            if isinstance(doc['abstract'], str) or ('body' in doc.keys() and isinstance(doc['body'], str)):
                article = {}

                article['pmid'] = doc['pmid']
                article['pmcid'] = doc['pmid'] #will be null if article not available in MPCentral.
                article['fetching_date'] = doc['fetchingdate']

                texts = []
                #add keywords and MeSH to texts.
                keywords = [elt for elt in doc['keywords'] if isinstance(elt, str)]
                mesh = [elt for elt in doc['medical_subject_headings'] if isinstance(elt, str)]
                texts.extend(mesh)
                texts.extend(keywords)
                #add abstract and title to text
                if isinstance(doc.get('abstract'), str):
                    texts.append(doc['abstract'])
                if isinstance(doc['title'], str): 
                    texts.append(doc['title'])
                #add body, it can be missing if we only fetched abstracts.
                if 'body' in doc.keys() and isinstance(doc['body'], str):
                    texts.append(doc['body']) 

                article['text'] = " ".join(texts)

                return article
            
        except Exception as e: 
            logging.error(f"AtlasConnector: unable to fetch article with PMid {article.get('pmid')}: {e}.")
            return {}
        

    def clear_collection(self):
        """
        #USE WITH CAUTION, this deletes all documents in the connected MongoDB Atlas collection to start fresh.
        
        """
        try:
            result = self.collection.delete_many({})  # {} matches all documents
            logging.info(f"AtlasConnector: cleared collection. {result.deleted_count} documents deleted.")
        except errors.PyMongoError as e:
            logging.error(f"AtlasConnector: failed to clear collection: {e}.")
            raise

