import os
import sqlalchemy as sa
from config import Config

def get_engine():
    return sa.create_engine(Config.DATABASE_URL)

def get_connection():
    engine = get_engine()
    return engine.connect()
