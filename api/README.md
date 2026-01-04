# The API Service 
## Purpose 
The API service is **read-only** and decoupled from the ETL pipeline, it exposes a REST interface to **explore** the medical knowledge graph stored in Neo4j.  
It's built with **FastAPI**, which provides interactive API documentation via SwaggerUI at the `/docs` endpoint.

## Routes Overview 
- `/health` (**GET**): Health check endpoint  
- `/info` (**GET**): General graph information (counts, available labels and relation types)  
- `/nodes` (**GET**): Retrieve nodes from the knowledge graph  
    **Parameters:**  
        - `label`: Neo4j label (required, not case sensitive)  
        - `cui`: A specific CUI (optional, default None)  
        - `name`: A specific biomedical entity name (optional, default None)  
        - `limit`: The number of matched nodes to show (optional, max = 10000, default = 10)   

    **Example:**  
    ```bash 
    # get 20 nodes with label 'GENE' 
    GET /nodes?label=GENE&limit=20
    ```
- `/relation` (**GET**): Retrieve relations from the knowledge graph  
    **Parameters:**  
        - `type`: Neo4j relation type (required, not case sensitive)  
        - `source_cui`: Only get relations where the source entity has this CUI (optional, default None)    
        - `target_cui`: Only get relations where the target entity has this CUI (optional, default None)    
        - `limit`: The number of matched relations to show (optional, max = 10000, default = 10)   

    **Example:**  
    ```bash 
    # get 20 relations of type 'BINDS' where the source entity has the CUI 'C0018683'
    GET /relations?type=BINDS&source_cui=C0018683&limit=20
    ```

## Running the API 
Before running the API, create the `.env` file containing your Neo4j credentials (see `.env.example`) file.

### Running using Docker 
You can either run the API as a **standalone container**: 
```bash 
#make sure you are inside api/ directory and build the image 
docker build -t api:latest . 

#run the container
docker run --env-file .env -p 8000:8000 api  

#the API will be available at http://localhost:8000
```
Or together with the Frontend Service using Docker Compose:  

```bash 
# make sure you are in project root  
docker compose up --build 
```
As defined in `docker-compose.yml`:  
- The API is exposed in *port 8000*, and the Frontend in *port 8080*.  
- The services communicate through the Docker network.


### Running without Docker   

```bash 
#create and activate a virtual environment with the requirements: 
python -m venv .venv/
source .venv/bin/activate
python -m pip install -r requirements.txt

#then run it using uvicorn: 
uvicorn main:app --reload --host 0.0.0.0 --port 8000

#or using python: 
python main.py 
```
