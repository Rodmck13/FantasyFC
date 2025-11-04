from flask import request, jsonify
from models.user import get_user_by_email, init_db, get_db_connection
from utils.auth import hash_password, generate_token
import sqlalchemy as sa

def configure_auth_routes(app):
    @app.route('/api/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
            name = data.get('name')

            if not email or not password or not name:
                return jsonify({'error': 'All fields are required'}), 400

            if get_user_by_email(email):
                return jsonify({'error': 'User already exists'}), 400

            hashed_password = hash_password(password)

            conn = get_db_connection()
            result = conn.execute(
                sa.text('INSERT INTO users (email, password, name) VALUES (:email, :password, :name) RETURNING id'),
                {"email": email, "password": hashed_password, "name": name}
            )
            user_id = result.fetchone()[0]
            conn.commit()
            conn.close()

            return jsonify({'message': 'User created successfully'}), 201

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return jsonify({'error': 'Email and password are required'}), 400

            user = get_user_by_email(email)
            if not user or user['password'] != hash_password(password):
                return jsonify({'error': 'Invalid credentials'}), 401

            # Generate JWT token
            token = generate_token(user)

            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': {
                    'email': user['email'],
                    'name': user['name']
                }
            }), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500