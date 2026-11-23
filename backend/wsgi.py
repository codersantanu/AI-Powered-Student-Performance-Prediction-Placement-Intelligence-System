from pathlib import Path
from dotenv import load_dotenv
from . import create_app

load_dotenv(Path(__file__).with_name('.env'))
app = create_app()
