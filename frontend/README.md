# The Frontend Service 
## Purpose 
The frontend provides a visual overview and exploration interface for the medical knowledge graph built by the ETL pipeline and exposed through the API service.   
It's **decoupled from the ETL** process and depends only on the API.  
This frontend is meant to complement the project by providing visibility into the graph, **not to replace Neo4j Browser or Bloom**.  
## Tech Stack 
- TypeScript  
- Vite-based Setup  
- HTML/CSS  
- Nginx (for production serving via Docker)   
The frontend is built as a static application and served by Nginx in production.

## Running the Frontend 
The frontend requires one environment variable: **VITE_API_BASE_URL**; that is the URL for the API service.  

### Running using Docker  
To run as a standalone service, from `frontend/` folder:  
```bash 
#VITE_API_BASE_URL is automatically set to http://localhost:8000: 
docker build -t frontend: latest . 

# or pass the VITE_API_BASE_URL as Build arguments: 
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t frontend:latest .

#then run the container:  
docker run -p 8080:80 frontend:latest
```
To run together with the API service using Docker compose:   
```bash 
# from project root run: 
docker compose up --build 
```
- API will be exposed on *port 8000*  
- Frontend will be exposed on *port 8080*  
- `VITE_API_BASE_URL` is automatically set to http://api:8000 inside the container (as specified in `docker-compose.yml`)

### Running without Docker 
When **not using Docker**, make sure to create `.env.local` file inside `frontend/` folder for the `VITE_API_BASE_URL` variable:     
```bash 
cp .env.local.example .env.local 
```

make sure you are in `frontend/` repository, then run:  
```bash 
npm install 
npm run dev 
```

