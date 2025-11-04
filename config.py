import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    JWT_SECRET = os.environ.get('JWT_SECRET') or 'your-jwt-secret-key'
    JWT_ALGORITHM = 'HS256'
    # Database configuration
    if os.environ.get('DATABASE_URL'):
        DATABASE_URL = os.environ.get('DATABASE_URL').replace('postgres://', 'postgresql://')
        DATABASE_PATH = None
    else:
        # Development - use SQLite
        DATABASE_URL = 'sqlite:///users.db'
        DATABASE_PATH = 'users.db'
