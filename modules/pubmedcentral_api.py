from xml.etree import ElementTree as ET
from typing import override
from itertools import islice

import logging

from modules.pubmed_api import PubMedAPI, NewPubMedAPI
from config.secrets import PM_API_KEY_EMAIL
from config.apis_config import PM_QUERIES



#search_uids I guess will be the same, but the fetch_new_articles and xml_parser functions should be overriden 
class NewPMCAPI(NewPubMedAPI):
    def __init__(self, api_key = None, email = None):
        super().__init__(database = 'pmc', api_key = api_key, email = email)



    @override
    def fetch_pubmedcentral_articles(self, batch_size = 1000) -> list[dict]: 
        """Fetch data of articles whose UIDs are given to 'ids' param.
            Params: ids: dictionary of string pubmedcentral ids."""
        
        
        data_to_post = {
            'db' : 'pmc',  
            'retmode' : 'xml',        #json is not supported by EFetch endpoint.
            'rettype' : 'full', 
        }

        if self.api_key:
            data_to_post['api_key'] = self.api_key
        if self.email:
            data_to_post['email'] = self.email

        new_uids = self.uids_cache - self.old_cache
        logging.info(f"PubMedCentral API: {len(new_uids)} new UIDs articles to fetch.")
        
        articles = []
        while new_uids: 
            #iterate over the set of new UIDs
            iterator = iter(new_uids)
            batch = islice(iterator, batch_size)
            #save the iterator as a list so it doesn't get consumed
            batch = list(batch)
            #comma-delimited UIDs
            data_to_post['id'] = ','.join(batch)
            xml_response = self._send_post_request('fetch', data_to_post)
            articles.extend(self._parse_pubmedcentral_xml(xml_response))
            new_uids -= set(batch)
        
        self._save_cache()
        return articles

    @override 
    def _parse_pubmedcentral_xml(self, xml_response):
        """get the full textual content of an XML response returned by efetch endpoint of PubMedCentral"""
        if xml_response: 
            root = ET.fromstring(xml_response.text)

            article_body = root.find(".//body")
            if article_body is None:
                return None

            paragraphs = []
            for p in article_body.findall(".//p"):
                if p.text: 
                    paragraphs.append(p.text.strip())
            
            
            return "\n\n".join(paragraphs)

        else: 
            return None
    





if __name__ == "__main__":
    #testing example
    api = NewPMCAPI(api_key=PM_API_KEY_EMAIL["api_key"], email=PM_API_KEY_EMAIL['email'])
    api.search_uids("human", 10)
    print(api.fetch)



























#PubMed Central API to get the body text of free available articles. 
class PubMedCentralAPI(PubMedAPI): 
    def __init__(self, api_key = None, email = None):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
        self.api_key = api_key
        self.email = email
        self.headers = { "User-Agent": "MyResearchBot/1.0 (zakaria04aithssain@gmail.com)" }

        if api_key: logging.info("PubMedCentral API: API Key Used.")
        else: logging.warning("PubMedCentral API: API Key Absent.")

        if self.email: logging.info("PubMedCentral API: Email Used.\n")
        else: logging.warning("PubMedCentral API: Email Absent.\n")

    @override             
    def get_data_from_xml(self, pmc_id):
        search_result = self.search(db="pmc", pmc_id= pmc_id, rettype="full")
        response_xml =self.fetch(search_result, db="pmc", pmc_id= pmc_id, rettype="full")
        if response_xml: 
            root = ET.fromstring(response_xml.text)

            article_body = root.find(".//body")
            if article_body is None:
                return None

            paragraphs = []
            for p in article_body.findall(".//p"):
                if p.text: 
                    paragraphs.append(p.text.strip())
            
            
            return "\n\n".join(paragraphs)

        else: 
            return None
        



    

