import hashlib
import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from config import Config

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
            from models.user import get_user_by_email
            current_user = get_user_by_email(data['email'])
        except Exception as e:
            return jsonify({'error': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

def generate_token(user_data):
    return jwt.encode({
        'email': user_data['email'],
        'name': user_data['name'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)