import logging
import argparse
import sys
import time

from scripts.extract import extract_pubmed_to_mongo
from scripts.transform.annotate import annotate_mongo_articles
from scripts.transform.clean import prepare_data_for_neo4j
from scripts.load import load_to_Neo4j

from config.neo4jdb_config import NEO4J_LABELS, NEO4J_REL_TYPES


#TODO: CHECK THAT CLI ARGS SUPPORT ALL AVAILABLE OPTIONS, AND NO LONGER CONTAIN UNSUPPORTED ONES.




def timer(func):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"with normalization cache, {func.__name__} took {end - start:.6f} seconds")
        return result
    return wrapper



def extract_stage(article_content: bool = False,
                    max_results: int = None,
                    batch_size: int = 1000, bulk_size: int = 10000
    ):
    """get required articles data, either only abstracts or full content, from PubMed(Central) API, and load it to MongoDB  Cloud.
      Arguments: 
      article_content = if True, fetch articles full content if available on PubMedCentral. if False, fetch only abstracts from PubMed. 
      max_results = the number of articles to search for PER QUERY, if max_results = None (default), get all the articles available. 
      batch_size = Number of UIDs to POST per HTTP POST call to the API. 
      bulk_size = Number of articles to load to Mongo per bulk write."""
    try:
        logging.info("Starting extraction stage.")
        print("Starting extraction stage...")
        extract_pubmed_to_mongo(article_content, max_results, batch_size, bulk_size
        )
        logging.info("Extraction stage completed.")
        print("Extraction stage completed.")
        return True
    except KeyboardInterrupt:
        print("Extraction stage interrupted manually.")
        logging.warning("Extraction stage interrupted manually.")
        return False
    except Exception as e:
        print(f"Extraction stage failed: {e}")
        logging.exception(f"Extraction stage failed: {e}")
        return False



def annotate_stage():
    """Step 2: Apply NER and RE to articles stored in MongoDB"""
    try:
        logging.info("Starting annotation stage.")
        print("Starting annotation stage...")
        annotate_mongo_articles()
        logging.info(f"Annotation stage completed. Check data/ folder for created CSV files.")
        print("Annotation stage completed. Check data/ folder.")
        return True
    except KeyboardInterrupt:
        print("Annotation stage interrupted manually.")
        logging.warning("Annotation stage interrupted manually.")
        return False
    except Exception as e:
        print(f"Annotation stage failed: {e}")
        logging.exception(f"Annotation stage failed: {e}")
        return False



def clean_stage():
    """Step 3: Clean and prepare extracted data for Neo4j and return cleaned CSV paths."""
    try:
        logging.info("Starting cleaning stage.")
        print("Starting cleaning stage...")
        ents_path, rels_path = prepare_data_for_neo4j()
        logging.info(f"Cleaning stage completed. Cleaned files: {ents_path}, {rels_path}")
        print("Cleaning stage completed.")
        return ents_path, rels_path
    except KeyboardInterrupt:
        print("Cleaning stage interrupted manually.")
        logging.warning("Cleaning stage interrupted manually.")
        return None, None
    except Exception as e:
        print(f"Cleaning stage failed: {e}")
        logging.exception(f"Cleaning stage failed: {e}")
        return None, None



def load_stage(only_related = True, 
        ents_clean_csv='data/ready_for_neo4j/entities4neo4j.csv',
               rels_clean_csv='data/ready_for_neo4j/relations4neo4j.csv',
               labels=NEO4J_LABELS,
               reltypes=NEO4J_REL_TYPES,
               load_batch_size=1000):
    """Step 4: Load entities and relations into Neo4j Neo4j."""
    try:
        logging.info("Starting loading stage.")
        print("Starting loading stage...")
        load_to_Neo4j(
            only_related=only_related,
            labels_to_load=labels,
            ents_clean_csv=ents_clean_csv,
            reltypes_to_load=reltypes,
            rels_clean_csv=rels_clean_csv,
            load_batch_size=load_batch_size
        )
        logging.info("Loading stage completed.")
        print("Loading stage completed.")
        return True
    except KeyboardInterrupt:
        print("Loading stage interrupted manually.")
        logging.warning("Loading stage interrupted manually.")
        return False
    except Exception as e:
        print(f"Loading stage failed: {e}")
        logging.exception(f"Loading stage failed: {e}")
        return False



def run_etl(article_content: bool = False,
    only_related: bool = True,
    max_results: int = None,
    batch_size: int = 1000,
    bulk_size: int= 10000,
    load_batch_size=1000):
    """Full ETL pipeline orchestrator."""
    try:
        # Step 1: Extract
        print("=" * 50)
        print("ETL PIPELINE STARTING")
        print("=" * 50)
        
        if not extract_stage(article_content, max_results, batch_size, bulk_size):
            print("ETL pipeline stopped: Extraction stage failed or was interrupted.")
            logging.error("ETL pipeline stopped: Extraction stage failed or was interrupted.")
            return False
        
        # Step 2: Annotate
        if not annotate_stage():
            print("ETL pipeline stopped: Annotation stage failed or was interrupted.")
            logging.error("ETL pipeline stopped: Annotation stage failed or was interrupted.")
            return False
        
        # Step 3: Clean
        ents_path, rels_path = clean_stage()
        if not ents_path or not rels_path:
            print("ETL pipeline stopped: Cleaning stage failed or was interrupted.")
            logging.error("ETL pipeline stopped: Cleaning stage failed or was interrupted.")
            return False
        
        # Step 4: Load
        if not load_stage(only_related=only_related, ents_clean_csv=ents_path, rels_clean_csv=rels_path, load_batch_size=load_batch_size):
            print("ETL pipeline stopped: Loading stage failed or was interrupted.")
            logging.error("ETL pipeline stopped: Loading stage failed or was interrupted.")
            return False
        
        print("=" * 50)
        print("ETL PIPELINE COMPLETED SUCCESSFULLY")
        print("=" * 50)
        logging.info("ETL pipeline completed successfully.")
        return True
        
    except KeyboardInterrupt:
        print("\nETL pipeline interrupted manually.")
        logging.warning("ETL pipeline interrupted manually.")
        return False
    except Exception as e:
        print(f"ETL pipeline failed with unexpected error: {e}")
        logging.exception(f"ETL pipeline failed: {e}")
        return False


@timer
def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description="MedGraphETL Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
No Flags Examples:
  python main.py                    # Run full ETL pipeline
  python main.py extract            # Run only extraction stage
  python main.py annotate           # Run only annotation stage
  python main.py clean              # Run only cleaning stage
  python main.py load               # Run only loading stage
        """
    )
    
    parser.add_argument(
        "step", 
        nargs="?", 
        choices=["extract", "annotate", "clean", "load"],
        help="Run a specific ETL stage (omit to run full pipeline)"
    )
    
    parser.add_argument(
        "--max-results",
        type=int,
        default=None,
        help="Maximum results to search for PER QUERY. default: None (extracts all available results), max: 10000 for PubMed, No limit for the other databases." \
    )
    
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Number of UIDs to POST per each API call. (default: 1000)"
    )
    parser.add_argument(
        "--load-batch-size",
        type=int,
        default=1000,
        help="Batch size for loading nodes and relationships to Neo4j (default: 1000)"
    )
    parser.add_argument(
        "--bulk-size",
        type=int,
        default=10000,
        help="Bulk size for loading articles to Mongo per bulk write operation (default: 10000)"
    )
    
    parser.add_argument(
        "--article-content",
        action="store_true",
        help="Extract full articles contents instead of abstracts only"
    )
    parser.add_argument(
        "--include-singletons",
        action="store_true",
        help="Load all nodes to Neo4j, even those that are isolated (have no relationship) Default: only load related nodes."
    )
    
    args = parser.parse_args()
    
    success = False
    
    try:
        if args.step == "extract":
            success = extract_stage(
                max_results=args.max_results,
                article_content=args.article_content,
                batch_size=args.batch_size,
                bulk_size = args.bulk_size
            )
        elif args.step == "annotate":
            success = annotate_stage()
        elif args.step == "clean":
            ents_path, rels_path = clean_stage()
            success = bool(ents_path and rels_path)
            if success:
                print(f"Cleaned files ready: {ents_path}, {rels_path}")
        elif args.step == "load":
            success = load_stage(load_batch_size=args.load_batch_size,
                                 only_related=not args.include_singletons)
        else:
            success = run_etl(only_related=not args.include_singletons, 
                max_results=args.max_results,
                article_content= args.article_content,
                batch_size=args.batch_size,
                bulk_size=args.bulk_size,
                load_batch_size=args.load_batch_size
            )
    
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
        logging.warning("Process interrupted by user.")
    except Exception as e:
        print(f"Unexpected error: {e}")
        logging.exception("Unexpected error occurred")
        
    return success
   



if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)