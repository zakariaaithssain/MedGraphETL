# The ETL Service  
## Purpose
This Extract-Transform-Load data pipeline extracts data from *PubMed* databases API, transfroms it by applying Named Entity Recognition (NER), Relation Extraction (RE), and some cleaning and preprocessing, to finally load it to Neo4jDB to get the knowledge graph.  
This pipeline is built with a Command Line Interface (CLI) that supports several arguments to make every stage of the pipeline as configurable as possible.  

## Design Choice  
I chose to make this pipeline independent from the other services for the design choices mentioned in the main README file, so it's a batch pipeline not a live service. Run it only when you need to update or ingest new data into the graph. 

## Pipeline Flow  
Each script inside the `scripts/` folder corresponds to a certain stage. 
### 1 - Extraction stage:  
The extraction stage interacts with the E-Utilities API of the US National Institutes of Health (NIH) to get medical articles data, more precisely: the PubMed API if the goal is to get articles abstracts only, or PubMedCentral API if full articles content is required.   
The Extracted data is then stored in Mongo Database as a checkpoint before the next stage.

### 2 - Transformation stage:  
This stage consists of two main steps:  
- Annotation: Applying Biomedical Natural Language Processing (Bio-NLP) to the data stored in MongoDB: Named Entity Recognition (NER) via Scispacy's `en_ner_bionlp_13cg_md` Spacy model (more details about the model can be found in https://allenai.github.io/scispacy/), Entity Normalization via the Unified Medical Language System (UMLS), and Relation Extraction (RE) using Spacy rule-based Matchers and Dependency Matchers.  

- Cleaning : Contains multiple preprocessing steps to prepare the data to be compatible with a knowledge graph structure. This step outputs two structured CSV files, one for nodes, the other for relations.  

### 3 - Loading stage:  
This stage loads the structured CSV files to Neo4j Database where the data becomes a knowledge graph that can be explored and queried using Neo4j's DBMS.  
*Note:* I could've (and should've) used the BioCypher framework, but I wanted to build and optimize every stage using no frameworks.  

## Pipeline Optimization 
- Extraction stage: The fetched articles UIDs are cached locally to avoid re-fetching them whenever the service is re-launched. We also use Multithreading concurrency (I/O Bound task) with respect to the API's rate limiting.  

- MongoDB checkpoint: this is also an I/O Bound task, I tried Multithreading it, but I had some unknown problems (although Mongo driver is thread-safe). So instead, I used the supported Operations Bulk Write (to reduce network trips).  

- Annotation stage: this is a CPU Bound task, so I used Multiprocessing to annotate multiple articles in parallel.  
The annotation process also includes Entity Normalization, which can be done using Scispacy's EntityLinker, that relies on loading the Unified Medical Language System (UMLS) entirely to memory (I have a mediocre computer configuration). So I decided to implement UMLSNormalizer that relies on the UMLS API instead, and combined with concurrent API calls and also caching for further optimization.

- Loading stage: 








