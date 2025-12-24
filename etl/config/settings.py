import os
from dotenv import load_dotenv


load_dotenv()


PM_API_KEY_EMAIL = {
    "api_key": os.getenv("PM_API_KEY"),
    "email": os.getenv("PM_EMAIL")
}

UMLS_API_KEY = os.getenv("UMLS_API_KEY")

MONGO_CONNECTION_STR = os.getenv("MONGO_CONNECTION_STR")

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_AUTH = (
    os.getenv("NEO4J_USERNAME"),
    os.getenv("NEO4J_PASSWORD")
)

