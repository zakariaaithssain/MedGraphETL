# The ETL Service  
## Purpose
This Extract-Transform-Load data pipeline extracts data from *PubMed* databases API, transfroms it by applying Named Entity Recognition (NER), Relation Extraction (RE), and some cleaning and preprocessing, to finally load it to Neo4jDB to get the knowledge graph.  
This pipeline is built with a Command Line Interface (CLI) that supports several arguments to make every stage of the pipeline as configurable as possible.  


## Pipeline Flow  
Each script inside the `scripts/` folder corresponds to a certain stage. 
### 1 - Extraction stage:  
The extraction stage interacts with the E-Utilities API of the US National Institutes of Health (NIH) to get medical articles data, more precisely: the PubMed API if the goal is to get articles abstracts only, or PubMedCentral API if full articles content is required.   
The Extracted data is then stored in Mongo Database as a checkpoint before the next stage.

### 2 - Transformation stage:  
This stage consists of two main steps:  
    - *Annotation:* Applying Biomedical Natural Language Processing (Bio-NLP) to the data stored in MongoDB: Named Entity Recognition (NER) via Scispacy's `en_ner_bionlp_13cg_md` Spacy model (more details about the model can be found in https://allenai.github.io/scispacy/), Entity Normalization via the Unified Medical Language System (UMLS), and Relation Extraction (RE) using Spacy Token-Based Matchers and Dependency Matchers.    
    - *Cleaning:* Contains multiple preprocessing steps to prepare the data to be compatible with a knowledge graph structure. This step outputs two structured CSV files, one for nodes, the other for relations.  

### 3 - Loading stage:  
This stage loads the structured CSV files to Neo4j Database where the data becomes a knowledge graph that can be explored and queried using Neo4j's DBMS.  
    *Note:* I could've (and should've) used the BioCypher framework, but I wanted to build and optimize every stage using no frameworks.  

## Pipeline Optimization 
- **Extraction stage:** The fetched articles UIDs are cached locally to avoid re-fetching them whenever the service is re-launched. We also use Multithreading concurrency (I/O Bound task) with respect to the API's rate limiting.  

- **MongoDB checkpoint:** this is also an I/O Bound task, I tried Multithreading it, but I had some unknown problems (although Mongo driver is thread-safe). So instead, I used the supported Operations Bulk Write (to reduce network trips).  

- **Annotation stage:** this is a CPU Bound task, so I used Multiprocessing to annotate multiple articles in parallel.  
The annotation process also includes Entity Normalization, which can be done using Scispacy's EntityLinker, that relies on loading the Unified Medical Language System (UMLS) entirely to memory (I have a mediocre computer configuration). So I decided to implement UMLSNormalizer that relies on the UMLS API instead, and combined with concurrent API calls and also streamed caching for further optimization.

- **Loading stage:**  
There are multiple ways to load data to Neo4j:  
    1 - **Naive way:** by loading each node or relation at a time, this gives full control over the labels, which allows dynamic labeling and relation typing, but is extremely inefficient.  
    2 - **Using Cypher's `LOAD CSV`:** this loads an entire CSV file to Neo4j in one query, but we can't assign different labels and relation types to different records.  
    3- **Using Cypher's `UNWIND`:** this transforms any list back into individual rows, so we can give it a list of nodes of the same label, and load them in one query (same goes for relations).  
    
So I used the last method, as it offers dynamic labeling and relation typing, and also a good performance, as it loads nodes of the same label, or relations of the same relation type, at once.  

I also combined that with Multithreading since this is an I/O Bound task, but I encountered severe deadlocks when loading relations because of the nature of graph data (different relations are linked to the same nodes), so I came up with the following solution:   
    - **Step 1:** divide relations into batches (using an adjacency list and the Depth First Search algorithm), such that each batch contains relations belonging to **the same Connected Component** of the graph, then load these batches concurrently so different threads work on different Connected Components, thus no more deadlocks. (This solution was inspired by the following video that used Bipartite Graph concept to solve a similar problem: https://youtu.be/Cw5-7MWO-CY)  
    - **Step 2:** inside each Connected Component, relations of the same type are loaded to Neo4j using The Cypher `UNWIND` method. 
 

## Modules Overview
Inside the `modules/` folder, we have the following classes:  
- **`NewPubMedAPI` Class**: handles the different calls to the E-Utilities APIs, and implements the necessary methods to interact with it.  
- **`NewPMCAPI` Class**: inherits from the former class, and overrides the methods that are not compatible with PubMedCentral specifications.  
- **`UMLSNormalizer` Class**: responsible for Entity Normalization via UMLS API.  
- **`StreamingOptimizedNLP` Class**: responsible for different annotation tasks; NER, RE, and Entity Normalization (uses the former class for this task). (I renamed it that way when I was optimizing the pipeline because I tought it's a fancy name, streaming stands for the fact that it streams cache from time to time so we don't lose it if some error occurs.)  
- **`Neo4jConnector` Class**: used in the loading stage to interact with Neo4j Database.  
- **`MongoConnector` Class**: handles the interactions with Mongo Database during the Extraction-Transformation checkpoint.  


## Config Files  
- `settings.py`: loads credentials from `.env` file to environment variables. 

- `apis_config.py`: configures all the APIs rate limiting, and also the queries that are used to fetch data from E-Utilities.  
    *Note:* By configuring the queries, we can control what type of articles to fetch, and thus what type of data would our graph contain, however, that would require changing the NER model and also the RE matchers to be able to recognize the new desired labels and relations. 

- `nlp_config.py`: loads the Spacy NER model's name from environment, defines the Spacy Token-Based matchers and Dependency matchers used for RE, and also the generic entities to drop during the preprocessing phase (e.g 'cancer', 'cell').  

- `mongodb_config.py`: configures the Mongo Database cluster, collection, and database names.  

- `log_config.py`: configures the logging (level, format, file handler, and the mode).  

- `neo4j_config.py`: contains the entity Labels and relation Types recognized by the NER model and the Spacy matchers.  
    *Note*: using `en_ner_bionlp_13cg_md` Spacy model, we recognize the following entity types:  
    - AMINO_ACID
    - ANATOMICAL_SYSTEM
    - CANCER
    - CELL
    - CELLULAR_COMPONENT
    - DEVELOPING_ANATOMICAL_STRUCTURE
    - GENE_OR_GENE_PRODUCT
    - IMMATERIAL_ANATOMICAL_ENTITY
    - MULTI_TISSUE_STRUCTURE
    - ORGAN
    - ORGANISM
    - ORGANISM_SUBDIVISION
    - ORGANISM_SUBSTANCE
    - PATHOLOGICAL_FORMATION
    - SIMPLE_CHEMICAL
    - TISSUE

    Based on these labels, we recognize the following relations using the `Spacy matchers`:  
    - PRODUCES  
    - CONTAINS  
    - BINDS  
    - REGULATES  
    - EXPRESSED_IN  
    - MUTATED_IN  
    - PART_OF  
    - LOCATED_IN  
    - ORIGIN_OF  
    - CONTAINS_COMPONENT  
    - SURROUNDS  
    - DEVELOPS_INTO  
    - ORIGINATES_FROM  
    - ARISES_FROM  
    - AFFECTS  
    - ASSOCIATED_WITH  
    - DAMAGES  
    - BIOMARKER_FOR  
    - TOXIC_TO  
    - COMPONENT_OF  
    - SECRETED_BY  
    - TREATS  

 


## Running ETL Service  
The ETL service is designed as a batch process and is **not started automatically** with `docker compose up`.  
This is a deliberate design choice to keep data ingestion independent from graph exploration and to prevent accidental reprocessing.  
The ETL pipeline should be executed only **when data ingestion or updates are required**.  

**Note:** Before running the ETL, you need to configure the `.env` file, (see `.env.example` file).  
      This project is built using Neo4j **Aura** and Mongo **Atlas** (cloud databases), but **can be used with local** databases, by simply setting local credentials in the `.env` file.  

### ETL CLI Options 
The MedGraphETL pipeline exposes a command-line interface through `main.py`.  
You can run the full ETL pipeline or individual stages, with optional configuration flags.  
**Note:** Use the `--help` flag to see the available options.  

#### Basic Usage 

```bash 
python main.py [step] [options]
```
 - If `step` is omitted, the full etl pipeline is executed.  
 - If `step` is provided, only that ETL step is run. 

**Valid Steps:**  
    - `extract`  
    -  `annotate`  
    -  `clean`  
    -  `load`  

**Available Options:**  

- Extraction Options:  
    - `--max-results`: Maximum number of articles *per query*. If omitted, all available articles are fetched.  
    - `--batch-size`: Number of PubMed UIDs sent per API request, default is **1000**.  
    - `--bulk-size`: Number of articles written per MongoDB bulk operation, default is **10000**.  
    - `--article-content` (flag): If set, fetches full article content from PubMed Central instead of **abstracts only**.  

- Loading Options:  
    - `--load-batch-size`: Batch size for loading nodes and relationships into Neo4j, default is **1000**.  
    - `--include-singletons` (flag): If set, loads all nodes, including those with no relations. By default, **only related nodes** are loaded.  


#### Examples:  
```bash 
# Run full ETL pipeline with default settings
python main.py

# Run only extraction
python main.py extract

# Run only extraction with 500 articles per query and get full articles content
python main.py extract --max-results 500 --article-content

# Run full pipeline and include all nodes even isolated ones in Neo4j
python main.py --include-singletons

```

### Running the ETL Using Docker  
**Note:** This project is built using cloud databases, but **can be used with local** ones.  
To do so using Docker, you need a `docker-compose` file containing the ETL, MongoDB, and Neo4j services.  
Since we're using cloud, we only need a `Dockerfile`, as the ETL is a standalone service in this case.  

1 - Build the ETL image:   
```bash 
docker build -t medgraphetl:latest . 
```

2 - Run the ETL container and remove it afterwards (cache is persisted using a Docker volume):  
```bash 
# This is equivalent to running the full ETL pipeline with default settings
docker run --rm \
  -v medgraph-etl-cache:/etl/cache \
  --env-file .env \
  medgraph-etl 

  # To run with optional configuration, use this: 
docker run --rm \
  -v medgraph-etl-cache:/etl/cache \
  --env-file .env \
  medgraph-etl \
  [etl options listed above]
```

#### Examples: 
```bash 
# Run only extraction with 500 articles per query and get full articles content
docker run --rm \
  -v medgraph-etl-cache:/etl/cache \
  --env-file .env \
  medgraph-etl \
  extract --max-results 500 --article-content
``` 












