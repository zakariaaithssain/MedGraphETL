from xml.etree import ElementTree as ET
from typing import override
from concurrent.futures import ThreadPoolExecutor, as_completed

import logging

from modules.pubmed_api import PubMedAPI, NewPubMedAPI
from config.settings import PM_API_KEY_EMAIL




#search_uids I guess will be the same, but the fetch_new_articles and xml_parser functions should be overriden 
class NewPMCAPI(NewPubMedAPI):
    def __init__(self, api_key = None, email = None):
        super().__init__(database = 'pmc', api_key = api_key, email = email)



    @override
    def fetch_new_articles(self, batch_size=1000) -> list[dict]:
        """Fetch PMC articles. Overrides parent method."""
        data_to_post = {
            'db': 'pmc',
            'retmode': 'xml',
        }

        if self.api_key:
            data_to_post['api_key'] = self.api_key
        if self.email:
            data_to_post['email'] = self.email

        new_uids = self.uids_cache - self.old_cache
        logging.info(f"PubMedCentral API: {len(new_uids)} new UIDs articles to fetch.")

        batches = list(self._batcher(new_uids, batch_size))
        articles = []

        with ThreadPoolExecutor(max_workers= 8) as executor:
            futures = []
            for batch in batches: 
                data = data_to_post.copy()
                data['id'] = ','.join(batch)
                futures.append(executor.submit(self._combine_methods, data, batch))

            for future in as_completed(futures):
                articles.extend(future.result())


        self._save_cache()
        return articles




    def _parse_pmc_xml(self, xml_response) -> list[dict]:
        """Parse PMC XML and return list of article dictionaries."""
        if not xml_response:
            return []

        root = ET.fromstring(xml_response.text)
        articles = []

        # PMC uses <article> tags
        found_articles = root.findall('.//article')

        for article in found_articles:
            # Extract IDs
            pmcid = None
            pmid = None
            for article_id in article.findall('.//article-id'):
                id_type = article_id.get('pub-id-type')
                if id_type == 'pmc':
                    pmcid = article_id.text
                elif id_type == 'pmid':
                    pmid = article_id.text

            # Extract title
            title_elem = article.find('.//article-title')
            title = self._get_all_text(title_elem) if title_elem is not None else None

            # Extract abstract
            abstract_parts = []
            abstract_elem = article.find('.//abstract')
            if abstract_elem is not None:
                for p in abstract_elem.findall('.//p'):
                    text = self._get_all_text(p)
                    if text:
                        abstract_parts.append(text)
            abstract = "\n\n".join(abstract_parts) if abstract_parts else None

            # Extract full body text
            body_parts = []
            body_elem = article.find('.//body')
            if body_elem is not None:
                for p in body_elem.findall('.//p'):
                    text = self._get_all_text(p)
                    if text:
                        body_parts.append(text)
            body_text = "\n\n".join(body_parts) if body_parts else None

            parsed_data = {
                'pmid': pmid,
                'pmcid': pmcid,
                'title': title,
                'abstract': abstract,
                'body': body_text,  # Full text
            }

            articles.append(parsed_data)

        return articles



    def _get_all_text(self, element) -> str:
        """Recursively extract all text from an element, including nested tags."""
        if element is None:
            return ""
        
        # Get all text content including nested elements
        text_parts = []
        if element.text:
            text_parts.append(element.text)
        
        for child in element:
            text_parts.append(self._get_all_text(child))
            if child.tail:
                text_parts.append(child.tail)
        
        return "".join(text_parts).strip()
    

    @override
    def _combine_methods(self, data_to_post:dict, batch:list):
        """This is just to combine the _send_post_request and _parse_pmc_xml methods in one method
        so I can pass them to the submet method of the ThreadPoolExecutor."""
        xml_response = self._send_post_request('fetch', data_to_post)
        return self._parse_pmc_xml(xml_response)


    





# Test
if __name__ == "__main__":
    api = NewPMCAPI(api_key=PM_API_KEY_EMAIL["api_key"], 
                    email=PM_API_KEY_EMAIL['email'])
    
    api.search_uids(query="human", max_results= 20)
    res = api.fetch_new_articles()
    if res: print(res[0])
    else: print("no articles in results.")



####################### WILL BE DEPRECATED SOON ##############################################





















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
        



    

