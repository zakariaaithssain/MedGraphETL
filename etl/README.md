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
- Annotation: Applying Biomedical Natural Language Processing (Bio-NLP) to the data stored in MongoDB: Named Entity Recognition (NER) via Scispacy's `en_ner_bionlp_13cg_md` Spacy model (more details about the model can be found in https://allenai.github.io/scispacy/), Entity Normalization via the Unified Medical Language System (UMLS), and Relation Extraction (RE) using Spacy rule-based Matchers and Dependency Matchers.  

- Cleaning : Contains multiple preprocessing steps to prepare the data to be compatible with a knowledge graph structure. This step outputs two structured CSV files, one for nodes, the other for relations.  

### 3 - Loading stage:  
This stage loads the structured CSV files to Neo4j Database where the data becomes a knowledge graph that can be explored and queried using Neo4j's DBMS.  
*Note:* I could've (and should've) used the BioCypher framework, but I wanted to build and optimize every stage using no frameworks.  

## Pipeline Optimization 
- **Extraction stage:** The fetched articles UIDs are cached locally to avoid re-fetching them whenever the service is re-launched. We also use Multithreading concurrency (I/O Bound task) with respect to the API's rate limiting.  

- **MongoDB checkpoint:** this is also an I/O Bound task, I tried Multithreading it, but I had some unknown problems (although Mongo driver is thread-safe). So instead, I used the supported Operations Bulk Write (to reduce network trips).  

- **Annotation stage:** this is a CPU Bound task, so I used Multiprocessing to annotate multiple articles in parallel.  
The annotation process also includes Entity Normalization, which can be done using Scispacy's EntityLinker, that relies on loading the Unified Medical Language System (UMLS) entirely to memory (I have a mediocre computer configuration). So I decided to implement UMLSNormalizer that relies on the UMLS API instead, and combined with concurrent API calls and also streamed caching for further optimization.

- **Loading stage:**  
there are multiple ways to load data to Neo4j:  
    1 - **naive way:** by loading each node or relation at a time, this gives full control over the labels, which allows dynamic labeling and relation typing, but is extremely inefficient.  
    2 - **using Cypher's `LOAD CSV`:** this loads an entire CSV file to Neo4j in one query, but we can't assign different labels and relation types to different records.  
    3- **using Cypher's `UNWIND`:** this transforms any list back into individual rows, so we can give it a list of nodes of the same label, and load them in one query (same goes for relations).  
    
    So I used the last method, as it offers dynamic labeling and relation typing, and also a good performance, as it loads nodes of the same label, or relations of the same relation type, at once.  

    I also combined that with Multithreading since this is an I/O Bound task, but I encountered severe deadlocks when loading relations because of the nature of graph data (different relations are linked to the same nodes), so I came up with the following solution:   
 - **Step 1:** divide relations into batches (using an adjacency list and the Depth First Search algorithm), such that each batch contains relations belonging to **the same Connected Component** of the graph, then load these batches concurrently so different threads work on different Connected Components, thus no more deadlocks. (This solution was inspired by this video: https://youtu.be/Cw5-7MWO-CY)  
 - **Step 2:** inside each Connected Component, relations of the same type are loaded to Neo4j using The Cypher `UNWIND` method. 
 

## Modules Overview
Inside the `modules/` folder, we have the following classes:  
- **`NewPubMedAPI` Class**: handles the different calls to the E-Utilities APIs, and implements the necessary methods to interact with it.  
- **`NewPMCAPI` Class**: inherits from the former class, and overrides the methods that are not compatible with PubMedCentral specifications.  
- **`UMLSNormalizer` Class**: responsible for Entity Normalization via UMLS API.  
- **`StreamingOptimizedNLP` Class**: responsible for different annotation tasks; NER, RE, and Entity Normalization (uses the former class for this task). (I renamed it that way when I was optimizing the pipeline because I tought it's a fancy name, streaming stands for the fact that it streams cache from time to time so we don't lose it if some error occurs.)  
- **`Neo4jConnector` Class**: used in the loading stage to interact with Neo4j Database.  
- **`MongoConnector` Class**: handles the interactions with Mongo Database during the Extraction-Transformation checkpoint.  





