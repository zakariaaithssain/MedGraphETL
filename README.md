# MedGraphETL:


_“This product uses publicly available data from the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product.”_

**Note: This pipeline uses en_ner_bionlp13cg_md Scispacy NER model for NER and Spacy Matchers and Dependency Matchers for RE. Data is not being revised or validated by any professionals from the medical field.** 

## Main Files Structure 

.
├── api  
│   ├── Dockerfile  
│   ├── main.  
│   ├── .dockerignore  
│   ├── requirements.txt  
│   └── routers/  
│       ├── graph_info.py  
│       ├── helpers.py  
│       ├── nodes.py  
│       └── relations.py  
├── etl/  
│   ├── requirements.txt  
│   ├── Dockerfile  
│   ├── .dockerignore  
│   ├── main.py  
│   ├── data/  
│   ├── cache/  
│   ├── config/  
│   │   ├── apis_config.py  
│   │   ├── log_config.py  
│   │   ├── mongodb_config.py  
│   │   ├── neo4jdb_config.py  
│   │   ├── nlp_config.py  
│   │   └── settings.py  
│   ├── modules/  
│   │   ├── mongo.py  
│   │   ├── neo4j.py  
│   │   ├── nlp.py  
│   │   ├── pubmed_api.py  
│   │   ├── pubmedcentral_api.py  
│   │   └── umls_api.py  
│   └── scripts/  
│       ├── extract.py  
│       ├── load.py  
│       └── transform/  
│           ├── annotate.py  
│           └── clean.py  
├── frontend  
│   ├── Dockerfile  
│   ├── .dockerignore  
│   ├── package.json  
│   ├── package-lock.json  
│   ├── public/  
│   └── src/  
├── docker-compose.yml  
├── .gitignore  
├── LICENSE  
└── README.md  


