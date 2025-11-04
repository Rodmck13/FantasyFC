import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    JWT_SECRET = os.environ.get('JWT_SECRET') or 'your-jwt-secret-key'
    JWT_ALGORITHM = 'HS256'
    DATABASE_PATH = 'users.db'