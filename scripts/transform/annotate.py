import logging

from tqdm import tqdm
from concurrent.futures import ProcessPoolExecutor, as_completed
from modules.mongoatlas import MongoAtlasConnector
from modules.umls_api import UMLSNormalizer
from modules.nlp import StreamingOptimizedNLP

from config.secrets import MONGO_CONNECTION_STR



global_annotator = None
def get_annotator():
    "this actually loads the annotator once to the memory, but creates a unique one for each worker (I guess)"
    global global_annotator
    if global_annotator == None: 
        global_annotator = StreamingOptimizedNLP(
        normalizer=UMLSNormalizer(),
        entities_output_path= "data/extracted_entities.csv",
          relations_output_path= "data/extracted_relations.csv"
    )
    return global_annotator


def combiner( text, article):
    "combines entities and relations extraction with normalization methods so they"
    " can be passed to Process Pool Executor, "
    "this should be defined at top level because of the way processpool works (look this up, about pickle etc.)"
    annotator = get_annotator()
    (annotator.extract_and_normalize_entities(text, article_metadata= article)
                    .extract_relations(text, article_metadata= article))  
                

def annotate_mongo_articles(ents_path ="data/extracted_entities.csv", rels_path = "data/extracted_relations.csv"):
    
    connector = MongoAtlasConnector(connection_str=MONGO_CONNECTION_STR)
    #list[dict] each dict is an article
    articles = connector.fetch_articles_from_atlas(query={})
        
    #one for all so entities and relations could be saved in the class attr.
    #normalizer = UMLSNormalizer()
    # annotator = StreamingOptimizedNLP(
    #     normalizer=normalizer,
    #     entities_output_path=ents_path,
    #     relations_output_path=rels_path,
    # )


    logging.info("Annotation Process Started.")
    try:
        with ProcessPoolExecutor() as executor: 
            futures = [executor.submit(combiner, article.pop('text'), article) 
                       for article in tqdm(articles, desc= "submitting futures:")]
            for future in tqdm(futures, desc="Applying NLP over Mongo docs:"): future.result()
        # for article in tqdm(articles, desc="Applying NLP over Mongo docs:"):
        #     text = article.pop('text')
        #         #we are able to chain methods as we return self from each one
        #     (annotator.extract_and_normalize_entities(text, article_metadata= article)
        #             .extract_relations(text, article_metadata= article))    
        
    except KeyboardInterrupt: 
        logging.error("Annotation Process Interrupted Manually.")
        raise
    