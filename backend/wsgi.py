from dotenv import load_dotenv
from . import create_app

load_dotenv()
app = create_app()
