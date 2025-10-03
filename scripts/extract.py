""""this will contain Extraction Process functions for the project"""
import logging 

###
from modules.pubmed_api import PubMedAPI
from modules.pubmedcentral_api import PubMedCentralAPI
###

from modules.pubmed_api import NewPubMedAPI
from modules.pubmedcentral_api import NewPMCAPI
from modules.mongoatlas import MongoAtlasConnector

from config.secrets import PM_API_KEY_EMAIL
from config.apis_config import PM_QUERIES
from config.secrets import MONGO_CONNECTION_STR



#api key and email are optional, but if not provided, we have less requests rate. 
pubmed_api = NewPubMedAPI(api_key = PM_API_KEY_EMAIL["api_key"],
                        email = PM_API_KEY_EMAIL["email"])

pubmedcentral_api = NewPMCAPI(api_key = PM_API_KEY_EMAIL["api_key"],
                                        email = PM_API_KEY_EMAIL["email"])

mongo_connector = MongoAtlasConnector(connection_str=MONGO_CONNECTION_STR)




def extract_pubmed_to_mongo(article_content: bool = False,
                                            max_results: int = None,
                                              batch_size : int = 1000):
    """get required articles data, either only abstracts or full content, from PubMed(Central) API,
        and load it to MongoDB Atlas Cloud.
            Arguments: 
            article_content = if True, fetch articles full content if available on PubMedCentral. 
                            if False, fetch only abstracts from PubMed.
            max_results = the number of articles to search for PER QUERY, 
                        if max_results = None (default), get all the articles available.
            batch_size = Number of UIDs to POST per HTTP POST call to the API. 
            """
    try: 
        all_articles = _get_data_from_apis(article_content, max_results, batch_size)
        
        mongo_connector.load_articles_to_atlas(all_articles)

    except KeyboardInterrupt: 
        logging.error("Extraction process interrupted manually.")
        raise




def _get_data_from_apis(article_content = False,
                        max_results: int = None,
                        batch_size: int = 1000
                           ) -> list[dict]:
        """get required articles data, either only abstracts or full content, from PubMed(Central) API.
            Arguments: 
            article_content = if True, fetch articles full content if available on PubMedCentral. 
                            if False, fetch only abstracts from PubMed.
            max_results = the number of articles to search for PER QUERY, 
                        if max_results = None (default), get all the articles available.
            batch_size = Number of UIDs to POST per HTTP POST call to the API. 
            """
        logging.info("Extraction Process: searching UIDs of articles found for each query.")
        print("Searching UIDs...")

        if not article_content: 
            logging.warning("PubMed API: For 'pubmed' database, ESearch Endpoint is built to only retrieve the first 10,000 records matching the query. " \
                "To get more, either specify another database or use EDirect (a CLI). See PubMed API documentation for more info.")
            print("max results for 'pubmed' database is 10,000. See logs file for more info.")


        for query in PM_QUERIES:
            pubmed_api.search_uids(query=query, max_results= max_results)
        

        if article_content: 
            logging.info("Extraction Process: full articles content will be fetched if available on PMC.")
            all_articles = pubmedcentral_api.fetch_new_articles(batch_size=batch_size)
        else: 
            logging.info("Extraction Process: only articles abstracts and metadata will be fetched.")
            all_articles = pubmed_api.fetch_new_articles(batch_size= batch_size)
             
        
        return all_articles
             
            
            

             
        

























################## THIS WILL SOON BE DEPRECATED ######################################################

# #api key and email are optional, but if not provided, we have less requests rate. 
# pubmed_api = PubMedAPI(api_key = PM_API_KEY_EMAIL["api_key"],
#                         email = PM_API_KEY_EMAIL["email"])

# pubmedcentral_api = PubMedCentralAPI(api_key = PM_API_KEY_EMAIL["api_key"],
#                                         email = PM_API_KEY_EMAIL["email"])

# mongo_connector = MongoAtlasConnector(connection_str=MONGO_CONNECTION_STR)


# #less max_results, less API pression, more loop iterations
# #if max results is not specified, the default is 1k, the max is 10k
# def extract_pubmed_to_mongo(extract_abstracts_only=True, max_results=1000):
#     try: 
#         all_articles = _get_data_from_apis(pubmed_api, pubmedcentral_api,
#                                         extract_abstracts_only,
#                                             max_results) 
        
#         mongo_connector.load_articles_to_atlas(all_articles, abstract_only = True)

#     except KeyboardInterrupt: 
#         logging.error("Extraction Process Interrupted Manually.")
#         raise




# def _get_data_from_apis(pubmed_api: PubMedAPI,
#                          pubmedcentral_api: PubMedCentralAPI,
#                            extract_abstracts_only = True,
#                              max_results = 1000): 
#         """ 
#         #arguments:
#                 pubmed_api (resp. pubmedcentral_api) = PubMedAPI (resp. PubMedCentralAPI) instance 
#                 extract_abstracts_only = when set to False, it extracts also articles body.
#                                         This takes time because it requires an API call per article.
#                 max_results = the number of articles to get per iteration.
#                 #Note = the code is designed to always get all articles available per query, so 
#                 the max_results is only for specifiying how much to request from the API per iteration. 
#                 Decreasing max_results increases the number of loop iterations, but inhances API performance.
#                 """
        
#         all_articles = []

#         if extract_abstracts_only: logging.info(f"Extraction Process: extracting abstracts only\n")
#         else: logging.info(f"Extraction Process: extracting abstracts and full content, \n")
        
#         for cancer in PM_QUERIES.keys():
#             logging.info(f"Extraction Process: Working On: {cancer.capitalize()} Cancer.\n")

#             # searching only once, and using pagination to get all articles per search
#             search_results = pubmed_api.search(PM_QUERIES[cancer], max_results=max_results) #a json format
#             total_count = pubmed_api.search_results_count
#             start = 0
            
#             # checking the hard limit (10k articles per query)
#             while start < total_count and start < 10000:  
#                 remaining = min(total_count - start, 10000 - start) 
#                 current_max = min(max_results, remaining)
#                 logging.info(f"Extraction Process: {remaining} Articles To Get.")

#                 current_max = min(max_results, remaining)
#                 fetched_xml = pubmed_api.fetch(search_results, start=start, max_results=current_max)
#                 articles = pubmed_api.get_data_from_xml(fetched_xml)
#                 all_articles.extend(articles)

#                 # get full body if specified
#                 if not extract_abstracts_only:
#                     for article in articles:
#                         pmc_id = article["pmcid"]
#                         if pmc_id:
#                             article["body"] = pubmedcentral_api.get_data_from_xml(pmc_id=pmc_id)

#                 start += max_results


#         else: logging.info(f"Extraction Process: Finished Collecting Articles Abstracts.")

#         return all_articles 


